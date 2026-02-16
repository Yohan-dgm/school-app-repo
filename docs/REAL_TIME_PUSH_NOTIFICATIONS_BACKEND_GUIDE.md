# Real-Time Push Notifications Backend Implementation Guide

This guide provides complete instructions for the Laravel backend team to implement real-time push notifications using Laravel Reverb and Expo push notifications.

## Overview

The system combines two notification delivery methods:
1. **Real-time WebSocket notifications** (for users actively using the app)
2. **Push notifications** (for users when app is closed/background)

## Prerequisites

- Laravel 10/11 application
- Redis server for broadcasting
- Expo Server SDK for push notifications

## Phase 1: Laravel Reverb Setup

### 1.1 Install Laravel Reverb

```bash
# Install Reverb package
composer require laravel/reverb

# Install Reverb
php artisan reverb:install

# Publish Reverb config (optional)
php artisan vendor:publish --provider="Laravel\Reverb\ReverbServiceProvider"
```

### 1.2 Configure Environment Variables

Add these to your Laravel `.env` file:

```env
# Broadcasting Configuration
BROADCAST_DRIVER=reverb

# Reverb Configuration
REVERB_APP_ID=123456
REVERB_APP_KEY=ftlvjzbndng2pip2xruw
REVERB_APP_SECRET=your-secret-key-here
REVERB_HOST=172.16.20.149
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_ALLOWED_ORIGINS=*

# Queue Configuration (for processing notifications)
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

### 1.3 Configure Reverb

Update `config/reverb.php`:

```php
<?php

return [
    'default' => env('REVERB_SERVER', 'reverb'),

    'servers' => [
        'reverb' => [
            'host' => env('REVERB_HOST', '0.0.0.0'),
            'port' => env('REVERB_PORT', 8080),
            'hostname' => env('REVERB_HOSTNAME'),
            'options' => [
                'tls' => [],
            ],
            'max_request_size' => env('REVERB_MAX_REQUEST_SIZE', 10000),
            'scaling' => [
                'enabled' => env('REVERB_SCALING_ENABLED', false),
                'channel' => env('REVERB_SCALING_CHANNEL', 'reverb'),
                'server' => [
                    'url' => env('REDIS_URL'),
                    'host' => env('REDIS_HOST', '127.0.0.1'),
                    'port' => env('REDIS_PORT', 6379),
                    'username' => env('REDIS_USERNAME'),
                    'password' => env('REDIS_PASSWORD'),
                    'database' => env('REDIS_DB', 0),
                ],
            ],
            'pulse' => [
                'enabled' => env('REVERB_PULSE_ENABLED', true),
                'interval' => env('REVERB_PULSE_INTERVAL', 30),
            ],
        ],
    ],

    'apps' => [
        [
            'id' => env('REVERB_APP_ID'),
            'name' => env('REVERB_APP_NAME', 'School App'),
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'options' => [
                'host' => env('REVERB_HOST'),
                'port' => env('REVERB_PORT', 8080),
                'scheme' => env('REVERB_SCHEME', 'http'),
                'useTLS' => env('REVERB_SCHEME') === 'https',
            ],
            'allowed_origins' => ['*'],
            'ping_interval' => env('REVERB_PING_INTERVAL', 30),
            'activity_timeout' => env('REVERB_ACTIVITY_TIMEOUT', 30),
        ],
    ],
];
```

### 1.4 Configure Broadcasting

Update `config/broadcasting.php`:

```php
'connections' => [
    'reverb' => [
        'driver' => 'reverb',
        'key' => env('REVERB_APP_KEY'),
        'secret' => env('REVERB_APP_SECRET'),
        'app_id' => env('REVERB_APP_ID'),
        'options' => [
            'host' => env('REVERB_HOST', '127.0.0.1'),
            'port' => env('REVERB_PORT', 443),
            'scheme' => env('REVERB_SCHEME', 'https'),
            'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
        ],
        'client_options' => [
            // Guzzle client options: https://docs.guzzlephp.org/en/stable/request-options.html
        ],
    ],
    
    // Keep your existing pusher config as fallback
    'pusher' => [
        'driver' => 'pusher',
        'key' => env('PUSHER_APP_KEY'),
        'secret' => env('PUSHER_APP_SECRET'),
        'app_id' => env('PUSHER_APP_ID'),
        'options' => [
            'cluster' => env('PUSHER_APP_CLUSTER'),
            'useTLS' => true,
        ],
        'client_options' => [
            // Guzzle client options: https://docs.guzzlephp.org/en/stable/request-options.html
        ],
    ],
],
```

## Phase 2: Database Schema

### 2.1 Notifications Table

Create/update the notifications table:

```php
<?php
// Migration: create_notifications_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recipient_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('sender_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('title');
            $table->text('message');
            $table->enum('priority', ['normal', 'high', 'urgent'])->default('normal');
            $table->string('priority_label')->nullable();
            $table->string('priority_color')->nullable();
            $table->foreignId('notification_type_id')->constrained('notification_types');
            $table->string('action_url')->nullable();
            $table->string('action_text')->nullable();
            $table->string('image_url')->nullable();
            $table->boolean('is_read')->default(false);
            $table->boolean('is_delivered')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->json('metadata')->nullable(); // Additional data
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['recipient_id', 'is_read']);
            $table->index(['recipient_id', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('notifications');
    }
};
```

### 2.2 Push Tokens Table

```php
<?php
// Migration: create_user_push_tokens_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('user_push_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('push_token');
            $table->string('device_id');
            $table->enum('platform', ['ios', 'android']);
            $table->string('app_version')->nullable();
            $table->string('device_name')->nullable();
            $table->string('device_model')->nullable();
            $table->string('os_version')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
            
            // Prevent duplicate tokens
            $table->unique(['user_id', 'push_token']);
            $table->unique(['user_id', 'device_id']);
            $table->index('user_id');
            $table->index('is_active');
        });
    }

    public function down()
    {
        Schema::dropIfExists('user_push_tokens');
    }
};
```

### 2.3 Notification Types Table

```php
<?php
// Migration: create_notification_types_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('notification_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->string('icon')->nullable();
            $table->string('color')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        
        // Seed default notification types
        DB::table('notification_types')->insert([
            ['name' => 'Announcements', 'slug' => 'announcements', 'icon' => 'campaign', 'color' => '#10b981'],
            ['name' => 'Private Messages', 'slug' => 'messages', 'icon' => 'message', 'color' => '#8b5cf6'],
            ['name' => 'System Alerts', 'slug' => 'alerts', 'icon' => 'warning', 'color' => '#ef4444'],
            ['name' => 'Important Notifications', 'slug' => 'important', 'icon' => 'priority-high', 'color' => '#f59e0b'],
            ['name' => 'Birthday Alerts', 'slug' => 'birthday', 'icon' => 'cake', 'color' => '#ec4899'],
            ['name' => 'Academic Alerts', 'slug' => 'academic', 'icon' => 'school', 'color' => '#3b82f6'],
            ['name' => 'Payment Reminders', 'slug' => 'payment', 'icon' => 'payment', 'color' => '#059669'],
            ['name' => 'Events', 'slug' => 'events', 'icon' => 'event', 'color' => '#d97706'],
        ]);
    }

    public function down()
    {
        Schema::dropIfExists('notification_types');
    }
};
```

## Phase 3: Models

### 3.1 Notification Model

```php
<?php
// app/Models/Notification.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'recipient_id',
        'sender_id',
        'title',
        'message',
        'priority',
        'priority_label',
        'priority_color',
        'notification_type_id',
        'action_url',
        'action_text',
        'image_url',
        'is_read',
        'is_delivered',
        'read_at',
        'delivered_at',
        'metadata',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'is_delivered' => 'boolean',
        'read_at' => 'datetime',
        'delivered_at' => 'datetime',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = [
        'time_ago',
        'type_name',
    ];

    // Relationships
    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function notificationType(): BelongsTo
    {
        return $this->belongsTo(NotificationType::class);
    }

    // Accessors
    public function getTimeAgoAttribute(): string
    {
        return $this->created_at->diffForHumans();
    }

    public function getTypeNameAttribute(): ?string
    {
        return $this->notificationType?->name;
    }

    // Scopes
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('recipient_id', $userId);
    }

    public function scopeByType($query, $typeSlug)
    {
        return $query->whereHas('notificationType', function ($q) use ($typeSlug) {
            $q->where('slug', $typeSlug);
        });
    }

    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    // Methods
    public function markAsRead(): bool
    {
        if ($this->is_read) {
            return true;
        }

        return $this->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
    }

    public function markAsDelivered(): bool
    {
        if ($this->is_delivered) {
            return true;
        }

        return $this->update([
            'is_delivered' => true,
            'delivered_at' => now(),
        ]);
    }
}
```

### 3.2 UserPushToken Model

```php
<?php
// app/Models/UserPushToken.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPushToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'push_token',
        'device_id',
        'platform',
        'app_version',
        'device_name',
        'device_model',
        'os_version',
        'is_active',
        'last_used_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_used_at' => 'datetime',
    ];

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByPlatform($query, $platform)
    {
        return $query->where('platform', $platform);
    }

    // Methods
    public function updateLastUsed(): bool
    {
        return $this->update(['last_used_at' => now()]);
    }

    public function deactivate(): bool
    {
        return $this->update(['is_active' => false]);
    }
}
```

### 3.3 NotificationType Model

```php
<?php
// app/Models/NotificationType.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NotificationType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'icon',
        'color',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // Relationships
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeBySlug($query, $slug)
    {
        return $query->where('slug', $slug);
    }
}
```

## Phase 4: Broadcasting Events

### 4.1 Notification Created Event

```php
<?php
// app/Events/NotificationCreated.php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $notification;

    public function __construct(Notification $notification)
    {
        $this->notification = $notification->load('notificationType');
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->notification->recipient_id . '.notifications'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->notification->id,
            'recipient_id' => $this->notification->recipient_id,
            'title' => $this->notification->title,
            'message' => $this->notification->message,
            'priority' => $this->notification->priority,
            'priority_label' => $this->notification->priority_label,
            'priority_color' => $this->notification->priority_color,
            'type' => $this->notification->notificationType->slug,
            'type_name' => $this->notification->notificationType->name,
            'action_url' => $this->notification->action_url,
            'action_text' => $this->notification->action_text,
            'image_url' => $this->notification->image_url,
            'is_read' => $this->notification->is_read,
            'is_delivered' => $this->notification->is_delivered,
            'created_at' => $this->notification->created_at->toISOString(),
            'time_ago' => $this->notification->time_ago,
            'notification_type' => [
                'id' => $this->notification->notificationType->id,
                'name' => $this->notification->notificationType->name,
                'slug' => $this->notification->notificationType->slug,
            ],
        ];
    }
}
```

### 4.2 Notification Read Event

```php
<?php
// app/Events/NotificationRead.php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationRead implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $notification;

    public function __construct(Notification $notification)
    {
        $this->notification = $notification;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->notification->recipient_id . '.notifications'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'notification.read';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->notification->id,
            'recipient_id' => $this->notification->recipient_id,
            'is_read' => $this->notification->is_read,
            'read_at' => $this->notification->read_at?->toISOString(),
        ];
    }
}
```

### 4.3 Notification Stats Updated Event

```php
<?php
// app/Events/NotificationStatsUpdated.php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationStatsUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $userId;
    public $stats;

    public function __construct(int $userId, array $stats)
    {
        $this->userId = $userId;
        $this->stats = $stats;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->userId . '.notifications'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'notification.stats.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->userId,
            'unread_count' => $this->stats['unread_count'] ?? 0,
            'total_count' => $this->stats['total_count'] ?? 0,
            'updated_at' => now()->toISOString(),
        ];
    }
}
```

## Phase 5: Channel Authentication

### 5.1 Configure Broadcasting Routes

```php
<?php
// routes/channels.php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
*/

// Private notification channel for individual users
Broadcast::channel('user.{userId}.notifications', function ($user, $userId) {
    // Only allow users to listen to their own notifications
    return (int) $user->id === (int) $userId;
});

// Optional: School-wide announcement channel
Broadcast::channel('school.announcements', function ($user) {
    // All authenticated users can listen to school announcements
    return $user !== null;
});

// Optional: Class-specific channels
Broadcast::channel('class.{classId}', function ($user, $classId) {
    // Check if user belongs to this class
    return $user->classes()->where('class_id', $classId)->exists();
});
```

### 5.2 Broadcasting Authentication Route

Ensure this route exists in `routes/web.php` or add to `routes/api.php`:

```php
// routes/api.php or routes/web.php

// Broadcasting authentication route
Broadcast::routes(['middleware' => ['auth:sanctum']]);

// Alternative for API routes:
Route::post('/broadcasting/auth', function (Request $request) {
    return Broadcast::auth($request);
})->middleware('auth:sanctum');
```

## Phase 6: Services

### 6.1 Notification Service

```php
<?php
// app/Services/NotificationService.php

namespace App\Services;

use App\Events\NotificationCreated;
use App\Events\NotificationRead;
use App\Events\NotificationStatsUpdated;
use App\Models\Notification;
use App\Models\NotificationType;
use App\Models\User;
use Illuminate\Support\Collection;

class NotificationService
{
    /**
     * Create and send a notification
     */
    public function createNotification(array $data): Notification
    {
        // Get notification type
        $type = NotificationType::where('slug', $data['type'] ?? 'general')->first();
        if (!$type) {
            $type = NotificationType::where('slug', 'general')->first();
        }

        // Create notification
        $notification = Notification::create([
            'recipient_id' => $data['recipient_id'],
            'sender_id' => $data['sender_id'] ?? null,
            'title' => $data['title'],
            'message' => $data['message'],
            'priority' => $data['priority'] ?? 'normal',
            'priority_label' => $this->getPriorityLabel($data['priority'] ?? 'normal'),
            'priority_color' => $this->getPriorityColor($data['priority'] ?? 'normal'),
            'notification_type_id' => $type->id,
            'action_url' => $data['action_url'] ?? null,
            'action_text' => $data['action_text'] ?? null,
            'image_url' => $data['image_url'] ?? null,
            'metadata' => $data['metadata'] ?? null,
        ]);

        // Load relationships
        $notification->load('notificationType');

        // Broadcast real-time notification
        broadcast(new NotificationCreated($notification))->toOthers();

        // Send push notification (if user is not online)
        $this->sendPushNotification($notification);

        // Update user notification stats
        $this->updateUserStats($notification->recipient_id);

        return $notification;
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(int $notificationId, int $userId): bool
    {
        $notification = Notification::where('id', $notificationId)
            ->where('recipient_id', $userId)
            ->first();

        if (!$notification || $notification->is_read) {
            return false;
        }

        $notification->markAsRead();

        // Broadcast read event
        broadcast(new NotificationRead($notification))->toOthers();

        // Update user stats
        $this->updateUserStats($userId);

        return true;
    }

    /**
     * Mark all notifications as read for a user
     */
    public function markAllAsRead(int $userId): int
    {
        $count = Notification::where('recipient_id', $userId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        if ($count > 0) {
            $this->updateUserStats($userId);
        }

        return $count;
    }

    /**
     * Get notifications for a user
     */
    public function getUserNotifications(int $userId, array $filters = []): Collection
    {
        $query = Notification::with('notificationType')
            ->where('recipient_id', $userId)
            ->orderBy('created_at', 'desc');

        // Apply filters
        if (!empty($filters['unread_only'])) {
            $query->unread();
        }

        if (!empty($filters['type'])) {
            $query->byType($filters['type']);
        }

        if (!empty($filters['priority'])) {
            $query->byPriority($filters['priority']);
        }

        $limit = $filters['limit'] ?? 50;
        $offset = $filters['offset'] ?? 0;

        return $query->limit($limit)->offset($offset)->get();
    }

    /**
     * Get user notification stats
     */
    public function getUserStats(int $userId): array
    {
        $total = Notification::where('recipient_id', $userId)->count();
        $unread = Notification::where('recipient_id', $userId)->unread()->count();

        return [
            'user_id' => $userId,
            'total_count' => $total,
            'unread_count' => $unread,
            'read_count' => $total - $unread,
        ];
    }

    /**
     * Send push notification
     */
    private function sendPushNotification(Notification $notification): void
    {
        // This will be handled by the PushNotificationService
        app(PushNotificationService::class)->sendToUser(
            $notification->recipient_id,
            $notification->title,
            $notification->message,
            [
                'notification_id' => $notification->id,
                'type' => $notification->notificationType->slug,
                'priority' => $notification->priority,
                'action_url' => $notification->action_url,
            ]
        );
    }

    /**
     * Update user notification stats and broadcast
     */
    private function updateUserStats(int $userId): void
    {
        $stats = $this->getUserStats($userId);
        broadcast(new NotificationStatsUpdated($userId, $stats))->toOthers();
    }

    /**
     * Get priority label
     */
    private function getPriorityLabel(string $priority): string
    {
        return match ($priority) {
            'urgent' => 'Urgent',
            'high' => 'High Priority',
            'normal' => 'Normal',
            default => 'Normal',
        };
    }

    /**
     * Get priority color
     */
    private function getPriorityColor(string $priority): string
    {
        return match ($priority) {
            'urgent' => '#ef4444',
            'high' => '#f59e0b',
            'normal' => '#10b981',
            default => '#6b7280',
        };
    }

    /**
     * Send notification to multiple users
     */
    public function sendToMultipleUsers(array $userIds, array $data): Collection
    {
        $notifications = collect();

        foreach ($userIds as $userId) {
            $notificationData = array_merge($data, ['recipient_id' => $userId]);
            $notifications->push($this->createNotification($notificationData));
        }

        return $notifications;
    }

    /**
     * Send notification to all users with specific roles
     */
    public function sendToUsersByRole(array $roles, array $data): Collection
    {
        $users = User::whereHas('roles', function ($query) use ($roles) {
            $query->whereIn('name', $roles);
        })->pluck('id');

        return $this->sendToMultipleUsers($users->toArray(), $data);
    }
}
```

### 6.2 Push Notification Service

```php
<?php
// app/Services/PushNotificationService.php

namespace App\Services;

use App\Models\UserPushToken;
use ExpoSDK\Expo;
use ExpoSDK\ExpoMessage;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    private Expo $expo;

    public function __construct()
    {
        $this->expo = new Expo();
    }

    /**
     * Send push notification to a specific user
     */
    public function sendToUser(int $userId, string $title, string $body, array $data = []): bool
    {
        $tokens = UserPushToken::active()
            ->forUser($userId)
            ->pluck('push_token')
            ->toArray();

        if (empty($tokens)) {
            Log::info("No push tokens found for user {$userId}");
            return false;
        }

        return $this->sendToTokens($tokens, $title, $body, $data);
    }

    /**
     * Send push notification to multiple tokens
     */
    public function sendToTokens(array $tokens, string $title, string $body, array $data = []): bool
    {
        try {
            $messages = [];

            foreach ($tokens as $token) {
                $message = (new ExpoMessage([
                    'title' => $title,
                    'body' => $body,
                    'data' => $data,
                    'channelId' => $this->getChannelId($data['type'] ?? 'general'),
                    'priority' => $this->getExpoPriority($data['priority'] ?? 'normal'),
                    'sound' => 'default',
                    'badge' => $data['badge'] ?? null,
                ]))
                ->setTo($token)
                ->setJsonData($data);

                $messages[] = $message;
            }

            $response = $this->expo->send($messages);

            // Handle response and update token status if needed
            $this->handleExpoResponse($response, $tokens);

            Log::info('Push notifications sent successfully', [
                'token_count' => count($tokens),
                'title' => $title,
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('Failed to send push notification', [
                'error' => $e->getMessage(),
                'tokens' => $tokens,
                'title' => $title,
            ]);

            return false;
        }
    }

    /**
     * Register a push token for a user
     */
    public function registerToken(int $userId, array $tokenData): UserPushToken
    {
        // Deactivate existing tokens for this device
        UserPushToken::where('user_id', $userId)
            ->where('device_id', $tokenData['device_id'])
            ->update(['is_active' => false]);

        // Create new token record
        return UserPushToken::create([
            'user_id' => $userId,
            'push_token' => $tokenData['push_token'],
            'device_id' => $tokenData['device_id'],
            'platform' => $tokenData['platform'],
            'app_version' => $tokenData['app_version'] ?? null,
            'device_name' => $tokenData['device_name'] ?? null,
            'device_model' => $tokenData['device_model'] ?? null,
            'os_version' => $tokenData['os_version'] ?? null,
            'is_active' => true,
            'last_used_at' => now(),
        ]);
    }

    /**
     * Remove push token
     */
    public function removeToken(int $userId, string $deviceId = null, string $pushToken = null): bool
    {
        $query = UserPushToken::where('user_id', $userId);

        if ($deviceId) {
            $query->where('device_id', $deviceId);
        } elseif ($pushToken) {
            $query->where('push_token', $pushToken);
        } else {
            return false;
        }

        return $query->update(['is_active' => false]) > 0;
    }

    /**
     * Get notification channel ID based on type
     */
    private function getChannelId(string $type): string
    {
        return match ($type) {
            'academic' => 'academic-alerts',
            'payment' => 'payment-reminders',
            'events' => 'events',
            'alerts' => 'system-alerts',
            default => 'school-notifications',
        };
    }

    /**
     * Convert priority to Expo priority
     */
    private function getExpoPriority(string $priority): string
    {
        return match ($priority) {
            'urgent' => 'high',
            'high' => 'high',
            'normal' => 'default',
            default => 'default',
        };
    }

    /**
     * Handle Expo response and update token status
     */
    private function handleExpoResponse($response, array $tokens): void
    {
        // Implementation to handle failed tokens and update their status
        // This would mark invalid tokens as inactive
        foreach ($response as $index => $ticket) {
            if (isset($ticket['status']) && $ticket['status'] === 'error') {
                $token = $tokens[$index] ?? null;
                if ($token) {
                    UserPushToken::where('push_token', $token)
                        ->update(['is_active' => false]);
                    
                    Log::warning('Push token marked as inactive', [
                        'token' => $token,
                        'error' => $ticket['message'] ?? 'Unknown error',
                    ]);
                }
            }
        }
    }

    /**
     * Send school-wide announcement
     */
    public function sendSchoolAnnouncement(string $title, string $body, array $data = []): bool
    {
        $tokens = UserPushToken::active()->pluck('push_token')->toArray();
        
        if (empty($tokens)) {
            return false;
        }

        // Send in batches to avoid API limits
        $batches = array_chunk($tokens, 100);
        $success = true;

        foreach ($batches as $batch) {
            if (!$this->sendToTokens($batch, $title, $body, $data)) {
                $success = false;
            }
        }

        return $success;
    }
}
```

## Phase 7: Controllers

### 7.1 Notification Controller

```php
<?php
// app/Http/Controllers/Api/NotificationController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    private NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Get user notifications
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'page' => 'integer|min:1',
            'limit' => 'integer|min:1|max:100',
            'filter' => 'string|in:all,unread,read',
            'type' => 'string',
            'priority' => 'string|in:normal,high,urgent',
        ]);

        $userId = $request->user()->id;
        $page = $request->get('page', 1);
        $limit = $request->get('limit', 20);
        $offset = ($page - 1) * $limit;

        $filters = [
            'limit' => $limit,
            'offset' => $offset,
            'unread_only' => $request->get('filter') === 'unread',
            'type' => $request->get('type'),
            'priority' => $request->get('priority'),
        ];

        $notifications = $this->notificationService->getUserNotifications($userId, $filters);
        $stats = $this->notificationService->getUserStats($userId);

        return response()->json([
            'success' => true,
            'data' => $notifications,
            'metadata' => [
                'page' => $page,
                'limit' => $limit,
                'total_count' => $stats['total_count'],
                'unread_count' => $stats['unread_count'],
                'has_more' => $notifications->count() === $limit,
            ],
        ]);
    }

    /**
     * Get notification stats
     */
    public function stats(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $stats = $this->notificationService->getUserStats($userId);

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request): JsonResponse
    {
        $request->validate([
            'notificationId' => 'required|integer|exists:notifications,id',
        ]);

        $userId = $request->user()->id;
        $notificationId = $request->get('notificationId');

        $success = $this->notificationService->markAsRead($notificationId, $userId);

        return response()->json([
            'success' => $success,
            'message' => $success ? 'Notification marked as read' : 'Failed to mark notification as read',
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $count = $this->notificationService->markAllAsRead($userId);

        return response()->json([
            'success' => true,
            'message' => "{$count} notifications marked as read",
            'count' => $count,
        ]);
    }

    /**
     * Create a new notification (for admins/teachers)
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'recipient_id' => 'required|integer|exists:users,id',
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'string|exists:notification_types,slug',
            'priority' => 'string|in:normal,high,urgent',
            'action_url' => 'nullable|string',
            'action_text' => 'nullable|string',
            'image_url' => 'nullable|url',
        ]);

        $notification = $this->notificationService->createNotification([
            'recipient_id' => $request->get('recipient_id'),
            'sender_id' => $request->user()->id,
            'title' => $request->get('title'),
            'message' => $request->get('message'),
            'type' => $request->get('type', 'general'),
            'priority' => $request->get('priority', 'normal'),
            'action_url' => $request->get('action_url'),
            'action_text' => $request->get('action_text'),
            'image_url' => $request->get('image_url'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notification sent successfully',
            'data' => $notification,
        ], 201);
    }
}
```

### 7.2 Push Token Controller

```php
<?php
// app/Http/Controllers/Api/PushTokenController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PushNotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PushTokenController extends Controller
{
    private PushNotificationService $pushService;

    public function __construct(PushNotificationService $pushService)
    {
        $this->pushService = $pushService;
    }

    /**
     * Register a push token
     */
    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'push_token' => 'required|string',
            'device_id' => 'required|string',
            'platform' => 'required|string|in:ios,android',
            'app_version' => 'nullable|string',
            'device_name' => 'nullable|string',
            'device_model' => 'nullable|string',
            'os_version' => 'nullable|string',
        ]);

        try {
            $token = $this->pushService->registerToken(
                $request->user()->id,
                $request->all()
            );

            return response()->json([
                'success' => true,
                'message' => 'Push token registered successfully',
                'data' => [
                    'id' => $token->id,
                    'device_id' => $token->device_id,
                    'platform' => $token->platform,
                    'registered_at' => $token->created_at,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to register push token',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove a push token
     */
    public function delete(Request $request): JsonResponse
    {
        $request->validate([
            'device_id' => 'nullable|string',
            'push_token' => 'nullable|string',
        ]);

        if (!$request->has('device_id') && !$request->has('push_token')) {
            return response()->json([
                'success' => false,
                'message' => 'Either device_id or push_token is required',
            ], 400);
        }

        try {
            $success = $this->pushService->removeToken(
                $request->user()->id,
                $request->get('device_id'),
                $request->get('push_token')
            );

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Push token removed successfully' : 'Push token not found',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove push token',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
```

## Phase 8: API Routes

### 8.1 Notification Routes

```php
<?php
// routes/api.php

use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PushTokenController;

Route::middleware(['auth:sanctum'])->group(function () {
    
    // Notification routes
    Route::prefix('communication-management/notifications')->group(function () {
        Route::post('list', [NotificationController::class, 'index']);
        Route::post('stats', [NotificationController::class, 'stats']);
        Route::post('mark-read', [NotificationController::class, 'markAsRead']);
        Route::post('mark-all-read', [NotificationController::class, 'markAllAsRead']);
        Route::post('create', [NotificationController::class, 'store']);
    });

    // Push token routes
    Route::prefix('user-management/push-tokens')->group(function () {
        Route::post('register', [PushTokenController::class, 'register']);
        Route::post('delete', [PushTokenController::class, 'delete']);
    });
});
```

## Phase 9: Installation Commands

### 9.1 Install Expo Server SDK

```bash
composer require expo/server-sdk-php
```

### 9.2 Run Migrations

```bash
php artisan migrate
```

### 9.3 Start Services

```bash
# Start Reverb WebSocket server
php artisan reverb:start --host=0.0.0.0 --port=8080

# Start queue worker (in another terminal)
php artisan queue:work

# Start Laravel development server (in another terminal)
php artisan serve --host=0.0.0.0 --port=9999
```

## Phase 10: Testing

### 10.1 Test WebSocket Connection

```bash
# Test WebSocket connection
curl -X POST http://172.16.20.149:9999/broadcasting/auth \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 10.2 Test Notification Creation

```bash
# Create a test notification
curl -X POST http://172.16.20.149:9999/api/communication-management/notifications/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": 1,
    "title": "Test Notification",
    "message": "This is a test notification",
    "type": "general",
    "priority": "normal"
  }'
```

### 10.3 Test Push Token Registration

```bash
# Register push token
curl -X POST http://172.16.20.149:9999/api/user-management/push-tokens/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "push_token": "ExponentPushToken[xxx]",
    "device_id": "device123",
    "platform": "ios",
    "app_version": "1.0.0"
  }'
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if Reverb server is running
   - Verify firewall settings for port 8080
   - Check broadcasting configuration

2. **Push Notifications Not Working**
   - Verify Expo push token format
   - Check device permissions
   - Review Expo service status

3. **Authentication Errors**
   - Verify Sanctum token format
   - Check middleware configuration
   - Review user permissions

### Debug Commands

```bash
# Check Reverb status
php artisan reverb:ping

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# Check queue status
php artisan queue:failed
```

This comprehensive guide provides everything needed to implement real-time push notifications with Laravel Reverb and Expo. The frontend is already configured to work with these endpoints and WebSocket connections.