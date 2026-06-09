import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Pressable } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface Camera {
  id: string;
  name: string;
  location_label?: string;
  hls_url?: string;
}

interface CameraFeedProps {
  camera: Camera;
  style?: object;
}

export function CameraFeed({ camera, style }: CameraFeedProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const onStatus = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setLoading(false);
      setError(false);
    } else if (status.error) {
      setLoading(false);
      setError(true);
    }
  }, []);

  if (!camera.hls_url) {
    return (
      <View style={[styles.container, styles.placeholder, style]}>
        <Ionicons name="videocam-off-outline" size={28} color="#6b7280" />
        <Text style={styles.placeholderText}>Stream not configured</Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity onPress={() => setFullscreen(true)} activeOpacity={0.9} style={[styles.container, style]}>
        <Video
          source={{ uri: camera.hls_url }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isMuted
          isLooping
          onPlaybackStatusUpdate={onStatus}
        />

        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
        {error && (
          <View style={styles.overlay}>
            <Ionicons name="videocam-off-outline" size={24} color="#fff" />
            <Text style={styles.errorText}>Offline</Text>
          </View>
        )}

        {/* Bottom label */}
        <View style={styles.labelBar}>
          <View style={[styles.dot, error ? styles.dotRed : styles.dotGreen]} />
          <Text style={styles.labelText} numberOfLines={1}>{camera.name}</Text>
          {camera.location_label ? <Text style={styles.sublabelText} numberOfLines={1}> · {camera.location_label}</Text> : null}
          <Ionicons name="expand-outline" size={12} color="#ccc" style={{ marginLeft: 'auto' }} />
        </View>
      </TouchableOpacity>

      {/* Fullscreen modal */}
      <Modal visible={fullscreen} animationType="fade" statusBarTranslucent>
        <View style={styles.fsContainer}>
          <Video
            source={{ uri: camera.hls_url }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isMuted
          />
          <View style={styles.fsTopBar}>
            <Text style={styles.fsTitle}>{camera.name}</Text>
            {camera.location_label ? <Text style={styles.fsSub}>{camera.location_label}</Text> : null}
            <Pressable onPress={() => setFullscreen(false)} style={styles.fsClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

interface CameraGridProps {
  cameras: Camera[];
}

export function CameraGrid({ cameras }: CameraGridProps) {
  if (!cameras.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="camera-outline" size={40} color="#9ca3af" />
        <Text style={styles.emptyText}>No cameras configured</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {cameras.map(cam => (
        <CameraFeed key={cam.id} camera={cam} style={styles.gridItem} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 10,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: {
    color: '#6b7280',
    fontSize: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  errorText: {
    color: '#fff',
    fontSize: 12,
  },
  labelBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotGreen: { backgroundColor: '#4ade80' },
  dotRed: { backgroundColor: '#f87171' },
  labelText: { color: '#f3f4f6', fontSize: 11, fontWeight: '600', flexShrink: 1 },
  sublabelText: { color: '#9ca3af', fontSize: 10, flexShrink: 1 },
  fsContainer: { flex: 1, backgroundColor: '#000' },
  fsTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
    gap: 8,
  },
  fsTitle: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  fsSub: { color: '#9ca3af', fontSize: 12 },
  fsClose: { padding: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 8 },
  gridItem: { width: '48%' },
});
