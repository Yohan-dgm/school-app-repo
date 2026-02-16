import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import { MaterialIcons } from "@expo/vector-icons";
import { BaseNotification } from "../../types/notifications";
import MediaPreviewModal from "../common/MediaPreviewModal";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface NotificationDetailsModalProps {
  visible: boolean;
  notification: BaseNotification | null;
  onClose: () => void;
  onMarkAsRead?: (id: number) => void;
}

export default function NotificationDetailsModal({
  visible,
  notification,
  onClose,
  onMarkAsRead,
}: NotificationDetailsModalProps) {
  if (!notification) return null;

  const [webViewHeight, setWebViewHeight] = React.useState(100);
  const [isPreviewVisible, setIsPreviewVisible] = React.useState(false);
  const isUnread = !(notification.is_read ?? notification.isRead);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "#ef4444";
      case "high":
        return "#f59e0b";
      case "normal":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " at " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  // Helper function to detect HTML content
  const isHTMLContent = (text: string) => {
    if (!text) return false;
    return /<[^>]+>/g.test(text);
  };

  // Helper function to wrap HTML content with proper styling
  const wrapHTMLContent = (html: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 16px;
            color: #374151;
            line-height: 24px;
            padding: 0;
            margin: 0;
            background: transparent;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 12px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
          }
          table, th, td {
            border: 1px solid #e5e7eb;
          }
          th, td {
            padding: 8px;
            text-align: left;
          }
          a {
            color: #3b82f6;
            text-decoration: underline;
          }
          p {
            margin: 8px 0;
          }
          h1, h2, h3, h4, h5, h6 {
            margin: 12px 0 8px 0;
            color: #111827;
          }
          ul, ol {
            margin: 8px 0;
            padding-left: 24px;
          }
          li {
            margin: 4px 0;
          }
          blockquote {
            border-left: 4px solid #3b82f6;
            padding-left: 16px;
            margin: 12px 0;
            color: #6b7280;
          }
          code {
            background-color: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
          }
          pre {
            background-color: #f3f4f6;
            padding: 12px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 12px 0;
          }
          pre code {
            background: none;
            padding: 0;
          }
        </style>
      </head>
      <body>
        ${html}
        <script>
          // Auto-height calculation function
          function updateHeight() {
            const height = Math.max(
              document.body.scrollHeight,
              document.documentElement.scrollHeight,
              document.body.offsetHeight,
              document.documentElement.offsetHeight,
              document.body.clientHeight,
              document.documentElement.clientHeight
            );

            // Send height to React Native
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ height: height }));
            }
          }

          // Send height when page loads
          if (document.readyState === 'complete') {
            updateHeight();
          } else {
            window.addEventListener('load', updateHeight);
          }

          // Send height when content changes (for dynamic content)
          if (window.ResizeObserver) {
            const observer = new ResizeObserver(updateHeight);
            observer.observe(document.body);
          }

          // Fallback: send height after short delays to catch late-loading content
          setTimeout(updateHeight, 100);
          setTimeout(updateHeight, 300);
          setTimeout(updateHeight, 500);

          // Update on image load
          const images = document.getElementsByTagName('img');
          for (let i = 0; i < images.length; i++) {
            images[i].addEventListener('load', updateHeight);
          }
        </script>
      </body>
      </html>
    `;
  };

  const handleActionPress = () => {
    if (notification.action_url) {
      Linking.openURL(notification.action_url);
    }
  };

  const handleMarkAsRead = () => {
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  // Comprehensive notification type mapping (same as UniversalNotificationSystem)
  const getNotificationTypeInfo = (notification: BaseNotification) => {
    // First check if we have a type_id and map it to the correct type
    let typeId: number | null = null;
    let typeName = "";
    let typeSlug = "";

    // Extract type_id from notification_type object or fallback fields
    if (
      typeof notification.notification_type === "object" &&
      notification.notification_type
    ) {
      typeId = notification.notification_type.id;
      typeName = notification.notification_type.name;
      typeSlug = notification.notification_type.slug;
    }

    // Map type_id to proper names and details
    const typeMapping: Record<
      number,
      { name: string; slug: string; icon: string; color: string }
    > = {
      1: {
        name: "Announcements",
        slug: "announcements",
        icon: "campaign",
        color: "#10b981",
      },
      2: {
        name: "Private Messages",
        slug: "messages",
        icon: "message",
        color: "#8b5cf6",
      },
      3: {
        name: "System Alerts",
        slug: "alerts",
        icon: "warning",
        color: "#ef4444",
      },
      4: {
        name: "Importance Notifications",
        slug: "important",
        icon: "priority-high",
        color: "#f59e0b",
      },
      5: {
        name: "Birthday Alert",
        slug: "birthday",
        icon: "cake",
        color: "#ec4899",
      },
    };

    // Use type_id mapping if available
    if (typeId && typeMapping[typeId]) {
      return typeMapping[typeId];
    }

    // Fallback to slug-based mapping for legacy data
    const slugMapping: Record<
      string,
      { name: string; slug: string; icon: string; color: string }
    > = {
      announcements: typeMapping[1],
      messages: typeMapping[2],
      alerts: typeMapping[3],
      important: typeMapping[4],
      birthday: typeMapping[5],
      // Additional legacy mappings
      announcement: typeMapping[1],
      message: typeMapping[2],
      alert: typeMapping[3],
      assignment: {
        name: "Assignment",
        slug: "assignment",
        icon: "assignment",
        color: "#3b82f6",
      },
      reminder: {
        name: "Reminder",
        slug: "reminder",
        icon: "schedule",
        color: "#f59e0b",
      },
    };

    if (typeSlug && slugMapping[typeSlug]) {
      return slugMapping[typeSlug];
    }

    // Try with the old type field
    if (notification.type && slugMapping[notification.type]) {
      return slugMapping[notification.type];
    }

    // Final fallback
    return {
      name: typeName || notification.type || "General Notification",
      slug: typeSlug || notification.type || "general",
      icon: "notifications",
      color: "#3b82f6",
    };
  };

  const typeInfo = getNotificationTypeInfo(notification);
  const notificationTypeColor = typeInfo.color;
  const notificationTypeName = typeInfo.name;
  const notificationTypeIcon = typeInfo.icon;

  const priorityColor = getPriorityColor(notification.priority || "normal");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.typeIconContainer,
                { backgroundColor: notificationTypeColor + "15" },
              ]}
            >
              <MaterialIcons
                name={notificationTypeIcon as any}
                size={24}
                color={notificationTypeColor}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.modalTitle}>Notification Details</Text>
              <Text
                style={[
                  styles.notificationType,
                  { color: notificationTypeColor },
                ]}
              >
                {/* {String(notificationTypeName)} */}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Banner */}
          {/* {isUnread && (
            <TouchableOpacity
              style={styles.unreadBanner}
              onPress={handleMarkAsRead}
            >
              <MaterialIcons
                name="mark-email-unread"
                size={16}
                color="#3b82f6"
              />
              <Text style={styles.unreadBannerText}>Mark as Read</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#3b82f6" />
            </TouchableOpacity>
          )} */}

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subject</Text>
            <Text style={styles.notificationTitle}>
              {String(notification.title || "No Title")}
            </Text>
          </View>

          {/* Message */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message</Text>
            {(() => {
              const messageContent =
                notification.message ||
                notification.description ||
                "No message content";
              const isHTML = isHTMLContent(String(messageContent));

              if (isHTML) {
                return (
                  <View style={styles.webViewContainer}>
                    <WebView
                      source={{ html: wrapHTMLContent(String(messageContent)) }}
                      style={[styles.webView, { height: webViewHeight }]}
                      scrollEnabled={false}
                      showsVerticalScrollIndicator={false}
                      showsHorizontalScrollIndicator={false}
                      originWhitelist={["*"]}
                      javaScriptEnabled={true}
                      scalesPageToFit={false}
                      bounces={false}
                      onMessage={(event) => {
                        try {
                          const data = JSON.parse(event.nativeEvent.data);
                          if (data.height && data.height > 0) {
                            // Add 20px padding to prevent cutting off content
                            setWebViewHeight(data.height + 20);
                          }
                        } catch (error) {
                          console.warn("WebView height update error:", error);
                        }
                      }}
                      onShouldStartLoadWithRequest={(request) => {
                        // Allow external links to open in browser
                        if (
                          request.url !== "about:blank" &&
                          !request.url.includes("data:text/html")
                        ) {
                          Linking.openURL(request.url);
                          return false;
                        }
                        return true;
                      }}
                    />
                  </View>
                );
              } else {
                return (
                  <Text style={styles.notificationMessage}>
                    {String(messageContent)}
                  </Text>
                );
              }
            })()}
          </View>

          {/* Image */}
          {notification.image_url && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Attachment</Text>
              <TouchableOpacity 
                onPress={() => setIsPreviewVisible(true)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: notification.image_url }}
                  style={styles.attachmentImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Metadata */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.metadataContainer}>
              {/* Priority */}
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Priority:</Text>
                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor: priorityColor + "20",
                      borderColor: priorityColor + "40",
                    },
                  ]}
                >
                  <Text style={[styles.priorityText, { color: priorityColor }]}>
                    {String(notification.priority || "normal").toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Target */}
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Sent to:</Text>
                <Text style={styles.metadataValue}>
                  {String(notification.target_display || "All Users")}
                </Text>
              </View>

              {/* Created Date */}
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Sent:</Text>
                <Text style={styles.metadataValue}>
                  {formatDateTime(notification.created_at)}
                </Text>
              </View>

              {/* Read Status */}
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Status:</Text>
                <View style={styles.statusContainer}>
                  <MaterialIcons
                    name={isUnread ? "mark-email-unread" : "done-all"}
                    size={14}
                    color={isUnread ? "#f59e0b" : "#10b981"}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: isUnread ? "#f59e0b" : "#10b981" },
                    ]}
                  >
                    {isUnread ? "Unread" : "Read"}
                  </Text>
                </View>
              </View>

              {/* Read Date */}
              {!isUnread && notification.read_at && (
                <View style={styles.metadataRow}>
                  <Text style={styles.metadataLabel}>Read:</Text>
                  <Text style={styles.metadataValue}>
                    {formatDateTime(notification.read_at)}
                  </Text>
                </View>
              )}

              {/* Expiration */}
              {notification.expires_at && (
                <View style={styles.metadataRow}>
                  <Text style={styles.metadataLabel}>Expires:</Text>
                  <Text style={[styles.metadataValue, styles.expirationText]}>
                    {formatDateTime(notification.expires_at)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Button */}
          {/* {notification.action_url && notification.action_text && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Action</Text>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleActionPress}
              >
                <MaterialIcons name="open-in-new" size={20} color="#3b82f6" />
                <Text style={styles.actionButtonText}>
                  {String(notification.action_text)}
                </Text>
                <MaterialIcons name="arrow-forward" size={16} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          )} */}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          {isUnread && (
            <TouchableOpacity
              style={styles.footerButton}
              onPress={handleMarkAsRead}
            >
              <MaterialIcons name="mark-email-read" size={18} color="#10b981" />
              <Text style={styles.footerButtonText}>Mark as Read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.footerButton, styles.closeFooterButton]}
            onPress={onClose}
          >
            <MaterialIcons name="close" size={18} color="#6b7280" />
            <Text
              style={[styles.footerButtonText, styles.closeFooterButtonText]}
            >
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <MediaPreviewModal
        visible={isPreviewVisible}
        onClose={() => setIsPreviewVisible(false)}
        mediaUrl={notification.image_url || null}
        mediaType="image"
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  notificationType: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  unreadBannerText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 28,
  },
  notificationMessage: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  webViewContainer: {
    width: "100%",
    backgroundColor: "transparent",
  },
  webView: {
    backgroundColor: "transparent",
  },
  attachmentImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  metadataContainer: {
    gap: 12,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
    flex: 1,
  },
  metadataValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  expirationText: {
    color: "#f59e0b",
    fontWeight: "600",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3b82f6",
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 12,
  },
  footerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0fdf4",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#10b981",
    gap: 6,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10b981",
  },
  closeFooterButton: {
    backgroundColor: "#f3f4f6",
    borderColor: "#d1d5db",
  },
  closeFooterButtonText: {
    color: "#6b7280",
  },
});
