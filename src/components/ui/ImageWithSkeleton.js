import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

const ImageWithSkeleton = ({ source, style, containerStyle, ...props }) => {
  const [loading, setLoading] = useState(true);

  // Flatten the array of styles to easily extract image-specific props
  const flattenedStyle = StyleSheet.flatten(style) || {};
  
  // Extract View-incompatible styles so we can safely apply the rest to the parent View wrapper
  const { 
    resizeMode, 
    tintColor, 
    overlayColor,
    ...containerSafeStyle 
  } = flattenedStyle;

  return (
    <View style={[styles.container, containerStyle, containerSafeStyle]}>
      <Image
        source={source}
        style={[
          styles.absoluteFillObject, 
          { resizeMode, tintColor, overlayColor },
          loading && styles.hiddenImage
        ]}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        {...props}
      />
      {loading && (
        <View style={styles.skeletonContainer}>
          <Skeleton 
             width="100%" 
             height="100%" 
             borderRadius={flattenedStyle.borderRadius || 0} 
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E1E9EE', // subtle backdrop tone
  },
  skeletonContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  absoluteFillObject: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  hiddenImage: {
    opacity: 0,
  },
});

export default ImageWithSkeleton;
