# Laravel Backend Implementation Guide for Calendar Events API

## 1. Route Setup (routes/api.php)

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CalendarManagementController;

// Calendar Management Routes
Route::prefix('calendar-management')->group(function () {
    Route::post('event/get-event-list-data', [CalendarManagementController::class, 'getEventListData']);
    Route::post('special-class/get-special-class-list-data', [CalendarManagementController::class, 'getSpecialClassListData']);
    Route::post('holiday/get-holiday-list-data', [CalendarManagementController::class, 'getHolidayListData']);
});
```

## 2. Controller Implementation (app/Http/Controllers/CalendarManagementController.php)

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Event;
use App\Models\SpecialClass;
use App\Models\Holiday;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Exception;

class CalendarManagementController extends Controller
{
    /**
     * Get event list data for calendar
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getEventListData(Request $request): JsonResponse
    {
        try {
            // Validate request
            $request->validate([
                'logInUserId' => 'required|integer|exists:users,id'
            ]);

            $logInUserId = $request->input('logInUserId');

            // Get user information
            $user = User::find($logInUserId);
            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not found',
                    'data' => null
                ], 404);
            }

            // Get events with proper filtering
            $eventsQuery = Event::with(['eventCategory', 'createdByUser'])
                ->where('is_active', true)
                ->orderBy('start_date', 'asc');

            // Apply visibility filtering
            $eventsQuery->where(function ($query) use ($logInUserId) {
                $query->where('visibility_type', 'Public')
                      ->orWhere('visibility_type', 'All Student & Educator')
                      ->orWhere('visibility_type', 'Parent & Guardian')
                      ->orWhere(function ($subQuery) use ($logInUserId) {
                          $subQuery->where('visibility_type', 'Private')
                                   ->where('created_by_user_id', $logInUserId);
                      });
            });

            $events = $eventsQuery->get();

            // Transform events to match frontend structure
            $transformedEvents = $events->map(function ($event) {
                return [
                    'id' => $event->id,
                    'title' => $event->title,
                    'description' => $event->description,
                    'start_date' => $event->start_date,
                    'end_date' => $event->end_date,
                    'start_time' => $event->start_time,
                    'end_time' => $event->end_time,
                    'visibility_type' => $event->visibility_type,
                    'event_category' => $event->event_category,
                    'created_by_user_id' => $event->created_by_user_id,
                    'created_at' => $event->created_at,
                    'updated_at' => $event->updated_at,
                ];
            });

            return response()->json([
                'status' => 'successful',
                'data' => [
                    'data' => $transformedEvents,
                    'total' => $transformedEvents->count(),
                    'event_count' => $transformedEvents->count()
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Calendar Events API Error: ' . $e->getMessage(), [
                'user_id' => $request->input('logInUserId'),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Internal server error',
                'data' => null
            ], 500);
        }
    }

    /**
     * Get special class list data for calendar
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getSpecialClassListData(Request $request): JsonResponse
    {
        try {
            // Validate request
            $request->validate([
                'logInUserId' => 'required|integer|exists:users,id'
            ]);

            $logInUserId = $request->input('logInUserId');

            // Get user information
            $user = User::find($logInUserId);
            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not found',
                    'data' => null
                ], 404);
            }

            // Get special classes with proper filtering
            $specialClassesQuery = SpecialClass::with(['instructor', 'subject'])
                ->where('is_active', true)
                ->orderBy('class_date', 'asc');

            // Apply visibility filtering based on user role
            $specialClassesQuery->where(function ($query) use ($logInUserId, $user) {
                $query->where('visibility_type', 'Public')
                      ->orWhere('visibility_type', 'All Student & Educator')
                      ->orWhere(function ($subQuery) use ($logInUserId) {
                          $subQuery->where('visibility_type', 'Private')
                                   ->where('instructor_id', $logInUserId);
                      });
            });

            $specialClasses = $specialClassesQuery->get();

            // Transform special classes to match frontend structure
            $transformedSpecialClasses = $specialClasses->map(function ($class) {
                return [
                    'id' => $class->id,
                    'title' => $class->class_name,
                    'description' => $class->description,
                    'start_date' => $class->class_date,
                    'end_date' => $class->class_date,
                    'start_time' => $class->start_time,
                    'end_time' => $class->end_time,
                    'visibility_type' => $class->visibility_type,
                    'instructor' => $class->instructor,
                    'subject' => $class->subject,
                    'location' => $class->location,
                    'max_students' => $class->max_students,
                    'enrolled_students' => $class->enrolled_students,
                    'created_by_user_id' => $class->instructor_id,
                    'created_at' => $class->created_at,
                    'updated_at' => $class->updated_at,
                ];
            });

            return response()->json([
                'status' => 'successful',
                'data' => [
                    'data' => $transformedSpecialClasses,
                    'total' => $transformedSpecialClasses->count(),
                    'class_count' => $transformedSpecialClasses->count()
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Special Classes API Error: ' . $e->getMessage(), [
                'user_id' => $request->input('logInUserId'),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Internal server error',
                'data' => null
            ], 500);
        }
    }

    /**
     * Get holiday list data for calendar
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getHolidayListData(Request $request): JsonResponse
    {
        try {
            // Validate request
            $request->validate([
                'logInUserId' => 'required|integer|exists:users,id'
            ]);

            $logInUserId = $request->input('logInUserId');

            // Get user information
            $user = User::find($logInUserId);
            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not found',
                    'data' => null
                ], 404);
            }

            // Get holidays - usually public for everyone
            $holidaysQuery = Holiday::where('is_active', true)
                ->orderBy('start_date', 'asc');

            $holidays = $holidaysQuery->get();

            // Transform holidays to match frontend structure
            $transformedHolidays = $holidays->map(function ($holiday) {
                return [
                    'id' => $holiday->id,
                    'title' => $holiday->holiday_name,
                    'description' => $holiday->description,
                    'start_date' => $holiday->start_date,
                    'end_date' => $holiday->end_date,
                    'start_time' => null, // Holidays are usually all-day
                    'end_time' => null,
                    'visibility_type' => 'Public', // Holidays are public
                    'holiday_type' => $holiday->holiday_type,
                    'is_recurring' => $holiday->is_recurring,
                    'created_by_user_id' => $holiday->created_by_user_id,
                    'created_at' => $holiday->created_at,
                    'updated_at' => $holiday->updated_at,
                ];
            });

            return response()->json([
                'status' => 'successful',
                'data' => [
                    'data' => $transformedHolidays,
                    'total' => $transformedHolidays->count(),
                    'holiday_count' => $transformedHolidays->count()
                ]
            ], 200);

        } catch (Exception $e) {
            Log::error('Holidays API Error: ' . $e->getMessage(), [
                'user_id' => $request->input('logInUserId'),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Internal server error',
                'data' => null
            ], 500);
        }
    }
}
```

## 3. Event Model (app/Models/Event.php)

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Event extends Model
{
    use HasFactory;

    protected $table = 'events';

    protected $fillable = [
        'title',
        'description',
        'start_date',
        'end_date',
        'start_time',
        'end_time',
        'visibility_type',
        'event_category_id',
        'created_by_user_id',
        'is_active'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Get the event category
     */
    public function eventCategory(): BelongsTo
    {
        return $this->belongsTo(EventCategory::class, 'event_category_id');
    }

    /**
     * Get the user who created this event
     */
    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
```

## 4. SpecialClass Model (app/Models/SpecialClass.php)

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpecialClass extends Model
{
    use HasFactory;

    protected $table = 'special_classes';

    protected $fillable = [
        'class_name',
        'description',
        'class_date',
        'start_time',
        'end_time',
        'instructor_id',
        'subject_id',
        'location',
        'max_students',
        'enrolled_students',
        'visibility_type',
        'is_active'
    ];

    protected $casts = [
        'class_date' => 'date',
        'is_active' => 'boolean',
        'max_students' => 'integer',
        'enrolled_students' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Get the instructor for this special class
     */
    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    /**
     * Get the subject for this special class
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }
}
```

## 5. Holiday Model (app/Models/Holiday.php)

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Holiday extends Model
{
    use HasFactory;

    protected $table = 'holidays';

    protected $fillable = [
        'holiday_name',
        'description',
        'start_date',
        'end_date',
        'holiday_type',
        'is_recurring',
        'created_by_user_id',
        'is_active'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_recurring' => 'boolean',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Get the user who created this holiday
     */
    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
```

## 6. EventCategory Model (app/Models/EventCategory.php)

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventCategory extends Model
{
    use HasFactory;

    protected $table = 'event_categories';

    protected $fillable = [
        'name',
        'description',
        'color',
        'icon',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];

    /**
     * Get events for this category
     */
    public function events(): HasMany
    {
        return $this->hasMany(Event::class, 'event_category_id');
    }
}
```

## 7. Subject Model (app/Models/Subject.php) - For Special Classes

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subject extends Model
{
    use HasFactory;

    protected $table = 'subjects';

    protected $fillable = [
        'subject_name',
        'subject_code',
        'description',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];

    /**
     * Get special classes for this subject
     */
    public function specialClasses(): HasMany
    {
        return $this->hasMany(SpecialClass::class, 'subject_id');
    }
}
```

## 8. Database Migration for Events Table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->enum('visibility_type', [
                'Public',
                'Private',
                'Parent & Guardian',
                'All Student & Educator'
            ])->default('Public');
            $table->unsignedBigInteger('event_category_id')->nullable();
            $table->unsignedBigInteger('created_by_user_id');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('event_category_id')->references('id')->on('event_categories');
            $table->foreign('created_by_user_id')->references('id')->on('users');

            $table->index(['start_date', 'is_active']);
            $table->index(['visibility_type', 'is_active']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('events');
    }
};
```

## 9. Database Migration for Special Classes Table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('special_classes', function (Blueprint $table) {
            $table->id();
            $table->string('class_name');
            $table->text('description')->nullable();
            $table->date('class_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedBigInteger('instructor_id');
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('location')->nullable();
            $table->integer('max_students')->default(30);
            $table->integer('enrolled_students')->default(0);
            $table->enum('visibility_type', [
                'Public',
                'Private',
                'All Student & Educator'
            ])->default('Public');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('instructor_id')->references('id')->on('users');
            $table->foreign('subject_id')->references('id')->on('subjects');

            $table->index(['class_date', 'is_active']);
            $table->index(['instructor_id', 'is_active']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('special_classes');
    }
};
```

## 10. Database Migration for Holidays Table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('holidays', function (Blueprint $table) {
            $table->id();
            $table->string('holiday_name');
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->enum('holiday_type', [
                'National',
                'Religious',
                'School',
                'Local'
            ])->default('School');
            $table->boolean('is_recurring')->default(false);
            $table->unsignedBigInteger('created_by_user_id');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('created_by_user_id')->references('id')->on('users');

            $table->index(['start_date', 'is_active']);
            $table->index(['holiday_type', 'is_active']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('holidays');
    }
};
```

## 11. Database Migration for Subjects Table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->string('subject_name');
            $table->string('subject_code')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('subjects');
    }
};
```

## 12. Database Migration for Event Categories Table

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('event_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('color', 7)->default('#007bff'); // Hex color
            $table->string('icon')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('event_categories');
    }
};
```

## 13. Database Seeder for Sample Data

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Event;
use App\Models\EventCategory;
use App\Models\SpecialClass;
use App\Models\Holiday;
use App\Models\Subject;
use App\Models\User;
use Carbon\Carbon;

class EventSeeder extends Seeder
{
    public function run()
    {
        // Create event categories first
        $categories = [
            ['name' => 'Academic', 'color' => '#007bff', 'icon' => 'book'],
            ['name' => 'Sports', 'color' => '#28a745', 'icon' => 'trophy'],
            ['name' => 'Cultural', 'color' => '#ffc107', 'icon' => 'music'],
            ['name' => 'Meeting', 'color' => '#dc3545', 'icon' => 'users'],
            ['name' => 'Holiday', 'color' => '#6f42c1', 'icon' => 'calendar'],
        ];

        foreach ($categories as $category) {
            EventCategory::create($category);
        }

        // Create subjects for special classes
        $subjects = [
            ['subject_name' => 'Mathematics', 'subject_code' => 'MATH', 'description' => 'Mathematics subject'],
            ['subject_name' => 'Science', 'subject_code' => 'SCI', 'description' => 'Science subject'],
            ['subject_name' => 'English', 'subject_code' => 'ENG', 'description' => 'English subject'],
            ['subject_name' => 'Art', 'subject_code' => 'ART', 'description' => 'Art subject'],
            ['subject_name' => 'Music', 'subject_code' => 'MUS', 'description' => 'Music subject'],
        ];

        foreach ($subjects as $subject) {
            Subject::create($subject);
        }

        // Get first user as creator
        $user = User::first();
        if (!$user) {
            $this->command->error('No users found. Please create users first.');
            return;
        }

        // Create sample events
        $events = [
            [
                'title' => 'Parent-Teacher Meeting',
                'description' => '<p>Monthly parent-teacher meeting to discuss student progress.</p>',
                'start_date' => Carbon::now()->addDays(7),
                'end_date' => Carbon::now()->addDays(7),
                'start_time' => '09:00:00',
                'end_time' => '12:00:00',
                'visibility_type' => 'Parent & Guardian',
                'event_category_id' => 4, // Meeting
                'created_by_user_id' => $user->id,
            ],
            [
                'title' => 'Annual Sports Day',
                'description' => '<p>Annual sports competition for all grades.</p>',
                'start_date' => Carbon::now()->addDays(14),
                'end_date' => Carbon::now()->addDays(14),
                'start_time' => '08:00:00',
                'end_time' => '16:00:00',
                'visibility_type' => 'Public',
                'event_category_id' => 2, // Sports
                'created_by_user_id' => $user->id,
            ],
            [
                'title' => 'Science Fair',
                'description' => '<p>Student science project exhibition.</p>',
                'start_date' => Carbon::now()->addDays(21),
                'end_date' => Carbon::now()->addDays(23),
                'start_time' => '10:00:00',
                'end_time' => '15:00:00',
                'visibility_type' => 'All Student & Educator',
                'event_category_id' => 1, // Academic
                'created_by_user_id' => $user->id,
            ],
        ];

        foreach ($events as $event) {
            Event::create($event);
        }

        // Create sample special classes
        $specialClasses = [
            [
                'class_name' => 'Advanced Mathematics',
                'description' => 'Advanced mathematics class for gifted students',
                'class_date' => Carbon::now()->addDays(5),
                'start_time' => '14:00:00',
                'end_time' => '15:30:00',
                'instructor_id' => $user->id,
                'subject_id' => 1, // Mathematics
                'location' => 'Room 101',
                'max_students' => 20,
                'enrolled_students' => 15,
                'visibility_type' => 'All Student & Educator',
            ],
            [
                'class_name' => 'Science Lab Session',
                'description' => 'Hands-on science experiments',
                'class_date' => Carbon::now()->addDays(10),
                'start_time' => '10:00:00',
                'end_time' => '11:30:00',
                'instructor_id' => $user->id,
                'subject_id' => 2, // Science
                'location' => 'Science Lab',
                'max_students' => 25,
                'enrolled_students' => 20,
                'visibility_type' => 'Public',
            ],
        ];

        foreach ($specialClasses as $class) {
            SpecialClass::create($class);
        }

        // Create sample holidays
        $holidays = [
            [
                'holiday_name' => 'New Year\'s Day',
                'description' => 'National holiday celebrating the new year',
                'start_date' => Carbon::create(Carbon::now()->year, 1, 1),
                'end_date' => Carbon::create(Carbon::now()->year, 1, 1),
                'holiday_type' => 'National',
                'is_recurring' => true,
                'created_by_user_id' => $user->id,
            ],
            [
                'holiday_name' => 'School Foundation Day',
                'description' => 'Annual celebration of school founding',
                'start_date' => Carbon::now()->addDays(30),
                'end_date' => Carbon::now()->addDays(30),
                'holiday_type' => 'School',
                'is_recurring' => true,
                'created_by_user_id' => $user->id,
            ],
            [
                'holiday_name' => 'Summer Break',
                'description' => 'Annual summer vacation',
                'start_date' => Carbon::create(Carbon::now()->year, 6, 1),
                'end_date' => Carbon::create(Carbon::now()->year, 7, 31),
                'holiday_type' => 'School',
                'is_recurring' => true,
                'created_by_user_id' => $user->id,
            ],
        ];

        foreach ($holidays as $holiday) {
            Holiday::create($holiday);
        }

        $this->command->info('Events, Special Classes, and Holidays seeded successfully!');
    }
}
```

## 14. API Testing Examples

### Special Classes API Test:

```
POST: http://your-domain.com/api/calendar-management/special-class/get-special-class-list-data

Headers:
- Content-Type: application/json
- Authorization: Bearer YOUR_TOKEN_HERE

Body (JSON):
{
    "logInUserId": 43
}
```

### Expected Special Classes Response:

```json
{
  "status": "successful",
  "data": {
    "data": [
      {
        "id": 1,
        "title": "Advanced Mathematics",
        "description": "Advanced mathematics class for gifted students",
        "start_date": "2025-01-21",
        "end_date": "2025-01-21",
        "start_time": "14:00:00",
        "end_time": "15:30:00",
        "visibility_type": "All Student & Educator",
        "instructor": {
          "id": 1,
          "full_name": "John Doe",
          "email": "john@example.com"
        },
        "subject": {
          "id": 1,
          "subject_name": "Mathematics",
          "subject_code": "MATH"
        },
        "location": "Room 101",
        "max_students": 20,
        "enrolled_students": 15
      }
    ],
    "total": 1,
    "class_count": 1
  }
}
```

### Holidays API Test:

```
POST: http://your-domain.com/api/calendar-management/holiday/get-holiday-list-data

Headers:
- Content-Type: application/json
- Authorization: Bearer YOUR_TOKEN_HERE

Body (JSON):
{
    "logInUserId": 43
}
```

### Expected Holidays Response:

```json
{
  "status": "successful",
  "data": {
    "data": [
      {
        "id": 1,
        "title": "New Year's Day",
        "description": "National holiday celebrating the new year",
        "start_date": "2025-01-01",
        "end_date": "2025-01-01",
        "start_time": null,
        "end_time": null,
        "visibility_type": "Public",
        "holiday_type": "National",
        "is_recurring": true
      }
    ],
    "total": 1,
    "holiday_count": 1
  }
}
```

## 15. Common Issues and Solutions

### Issue 1: 500 Internal Server Error

**Possible Causes:**

- Missing database tables
- Incorrect model relationships
- Validation errors
- Missing required fields

**Solutions:**

1. Check Laravel logs: `tail -f storage/logs/laravel.log`
2. Ensure migrations are run: `php artisan migrate`
3. Verify model relationships exist
4. Check required fields in request

### Issue 2: Empty Response

**Possible Causes:**

- No events in database
- Incorrect visibility filtering
- Wrong user permissions

**Solutions:**

1. Seed sample data: `php artisan db:seed --class=EventSeeder`
2. Check visibility_type values match exactly
3. Verify user exists and has correct permissions

### Issue 3: Authentication Issues

**Possible Causes:**

- Missing Bearer token
- Invalid user ID
- User not found

**Solutions:**

1. Ensure Bearer token is sent in headers
2. Verify logInUserId exists in users table
3. Check user authentication middleware

## 9. Testing the API

### Using Postman:

```
POST: http://your-domain.com/api/calendar-management/event/get-event-list-data

Headers:
- Content-Type: application/json
- Authorization: Bearer YOUR_TOKEN_HERE

Body (JSON):
{
    "logInUserId": 43
}
```

### Expected Response:

```json
{
  "status": "successful",
  "data": {
    "data": [
      {
        "id": 1,
        "title": "Parent-Teacher Meeting",
        "description": "<p>Monthly parent-teacher meeting to discuss student progress.</p>",
        "start_date": "2025-01-23",
        "end_date": "2025-01-23",
        "start_time": "09:00:00",
        "end_time": "12:00:00",
        "visibility_type": "Parent & Guardian",
        "event_category": {
          "id": 4,
          "name": "Meeting",
          "color": "#dc3545",
          "icon": "users"
        },
        "created_by_user_id": 1,
        "created_at": "2025-01-16T10:00:00.000000Z",
        "updated_at": "2025-01-16T10:00:00.000000Z"
      }
    ],
    "total": 1,
    "event_count": 1
  }
}
```

## 10. Quick Setup Commands

```bash
# Create migration files
php artisan make:migration create_event_categories_table
php artisan make:migration create_events_table
php artisan make:migration create_subjects_table
php artisan make:migration create_special_classes_table
php artisan make:migration create_holidays_table

# Create models
php artisan make:model Event
php artisan make:model EventCategory
php artisan make:model Subject
php artisan make:model SpecialClass
php artisan make:model Holiday

# Create controller
php artisan make:controller CalendarManagementController

# Create seeder
php artisan make:seeder EventSeeder

# Run migrations
php artisan migrate

# Seed data
php artisan db:seed --class=EventSeeder

# Clear cache
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```
