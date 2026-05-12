import React from 'react';
import { Text, Linking, StyleSheet } from 'react-native';

export const TextWithLinks = ({ children, style, linkStyle }) => {
  if (typeof children !== 'string') {
    return <Text style={style}>{children}</Text>;
  }

  // Regex to match URLs (http, https, www)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  
  const parts = children.split(urlRegex);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          // Ensure URL has http protocol if it starts with www
          const url = part.startsWith('www.') ? `https://${part}` : part;
          return (
            <Text
              key={index}
              style={[styles.link, linkStyle]}
              onPress={(e) => {
                e.stopPropagation(); // Prevent triggering parent TouchableOpacity if any
                Linking.openURL(url).catch(err => {
                  console.error('Error opening URL: ', err);
                });
              }}
            >
              {part}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  link: {
    color: '#007AFF', // Standard iOS link color
    textDecorationLine: 'underline',
  },
});
