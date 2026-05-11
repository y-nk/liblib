import { useState } from 'react'
import { View, Text, Image, Pressable, Modal, Platform, useColorScheme } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Camera } from 'lucide-react-native'

const isWeb = Platform.OS === 'web'

function assetToDataUrl(a: ImagePicker.ImagePickerAsset) {
  if (a.base64) {
    return `data:${a.mimeType || 'image/jpeg'};base64,${a.base64}`
  }

  return a.uri || ''
}

export default function CoverPicker({
  value,
  onChange,
  width = 80,
  aspectRatio = 210 / 297,
  editable = true,
}: {
  value: string
  onChange: (uri: string) => void
  width?: number
  aspectRatio?: number
  editable?: boolean
}) {
  const [showWebCam, setShowWebCam] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()
  const dark = useColorScheme() === 'dark'

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.3,
      base64: true,
      allowsEditing: true,
    })

    if (!result.canceled && result.assets[0]) {
      onChange(assetToDataUrl(result.assets[0]))
    }
  }

  const takePhoto = async () => {
    if (isWeb) {
      if (!permission?.granted) {
        requestPermission()
      }

      setShowWebCam(true)
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.3,
      base64: true,
      allowsEditing: true,
    })

    if (!result.canceled && result.assets[0]) {
      onChange(assetToDataUrl(result.assets[0]))
    }
  }

  const handleWebCapture = async (uri: string) => {
    try {
      const res = await fetch(uri)
      const blob = await res.blob()
      const b64: string = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve('')
        reader.readAsDataURL(blob)
      })
      onChange(b64)
    } catch {
      onChange(uri)
    }

    setShowWebCam(false)
  }

  return (
    <>
      {showWebCam && (
        <Modal visible animationType="slide" onRequestClose={() => setShowWebCam(false)}>
          <View className="flex-1 bg-black">
            <View className="flex-row justify-between items-center px-4 py-3">
              <Pressable onPress={() => setShowWebCam(false)}>
                <Text className="text-base text-white">Cancel</Text>
              </Pressable>
              <Text className="text-lg font-semibold text-white">Take Photo</Text>
              <View className="w-16" />
            </View>

            {!permission?.granted ? (
              <View className="flex-1 justify-center items-center">
                <Text className="text-gray-400">Camera access needed</Text>
              </View>
            ) : (
              <CameraView
                className="flex-1"
                facing="back"
                ref={(ref) => {
                  if (ref) {
                    ;(globalThis as any).__cameraRef = ref
                  }
                }}
              >
                <View className="flex-1 justify-end items-center pb-10">
                  <Pressable
                    onPress={async () => {
                      const cam = (globalThis as any).__cameraRef

                      if (cam) {
                        const photo = await cam.takePictureAsync({ quality: 0.5 })

                        if (photo?.uri) {
                          handleWebCapture(photo.uri)
                        }
                      }
                    }}
                    className="w-16 h-16 rounded-full bg-white border-4 border-gray-300"
                  />
                </View>
              </CameraView>
            )}
          </View>
        </Modal>
      )}

      <View style={{ width, aspectRatio }}>
        <Pressable
          onPress={editable ? takePhoto : undefined}
          onLongPress={editable ? pickImage : undefined}
          className="flex-1 border border-dashed border-gray-300 dark:border-neutral-600 rounded-xl overflow-hidden items-center justify-center bg-gray-50 dark:bg-neutral-800"
        >
          {value ? (
            <Image source={{ uri: value }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <>
              <Camera size={24} color={dark ? '#666' : '#9ca3af'} />

              {editable && <Text className="text-gray-400 text-xs mt-1">Hold: gallery</Text>}
            </>
          )}
        </Pressable>
      </View>
    </>
  )
}
