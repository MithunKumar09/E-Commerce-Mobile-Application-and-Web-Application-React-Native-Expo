import { useState, useEffect } from 'react';
import { Camera } from 'expo-camera';

export function useCameraPermissions() {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(null);

  const getPermissions = async () => {
    try {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus === 'granted');

      const { status: microphoneStatus } = await Camera.requestMicrophonePermissionsAsync();
      setHasMicrophonePermission(microphoneStatus === 'granted');
    } catch (error) {
      console.error('Error getting permissions:', error);
    }
  };

  useEffect(() => {
    getPermissions();
  }, []);

  return { hasCameraPermission, hasMicrophonePermission, requestCameraPermission: getPermissions };
}
