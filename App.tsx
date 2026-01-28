/// <reference types="nativewind/types" />

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

// --- 1. Types ---
type ViewMode = 'SETUP' | 'RINGING' | 'CONNECTED';

// --- 2. Assets ---
// Make sure you have this file!
const ringtoneSource = require('./assets/music/ringtone.mp3');

// --- 3. The "Gentle" Static Message ---
const generateExcuse = async (context: string): Promise<string> => {
  // Simulate "Thinking" delay
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  
  // The Funny/Gentle British Panic Message
  return "Hello? I am so sorry to interrupt, but I have just accidentally poured the milk in before the tea bag, and now the kettle is looking at me with judgement. I don't know what to do. Please come home immediately.";
};

export default function App() {
  // --- 4. State Management ---
  const [viewMode, setViewMode] = useState<ViewMode>('SETUP');
  const [contextInput, setContextInput] = useState<string>('');
  const [excuseText, setExcuseText] = useState<string>('');
  
  // Refs for Cleanup
  const ringtoneRef = useRef<any>(null);
  const hapticsInterval = useRef<NodeJS.Timeout | number | null>(null);
  
  // Timer for the connected call
  const [callTimer, setCallTimer] = useState<number>(0);

  // --- Logic: Cleanup Audio & Haptics ---
  const stopAllAudioAndHaptics = async () => {
    // 1. Clear Haptics Loop
    if (hapticsInterval.current !== null) {
      clearInterval(hapticsInterval.current as any);
      hapticsInterval.current = null;
    }

    // 2. Stop Ringtone
    if (ringtoneRef.current) {
      try {
        await ringtoneRef.current.stopAsync();
        await ringtoneRef.current.unloadAsync();
      } catch (e) { 
        console.log("Error unloading ringtone", e);
      }
      ringtoneRef.current = null;
    }

    // 3. Stop Speech
    Speech.stop();
  };

  // --- Effect: Handle RINGING State ---
  useEffect(() => {
    let isMounted = true;

    const startRingingSequence = async () => {
      if (viewMode === 'RINGING') {
        try {
          // A. Setup Audio Mode (Plays even on Silent switch)
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
          });

          // B. Load and Play Ringtone
          const { sound } = await Audio.Sound.createAsync(
            ringtoneSource,
            { isLooping: true, shouldPlay: true }
          );
          
          if (isMounted) {
            ringtoneRef.current = sound;
          } else {
            await sound.unloadAsync();
          }

          // C. Start Haptics Loop (Vibrate every 1.5s)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Heavy);
          hapticsInterval.current = setInterval(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Heavy);
          }, 1500);

        } catch (error) {
          console.error("Failed to start ringing sequence", error);
        }
      } else {
        // If we leave RINGING mode, stop everything
        stopAllAudioAndHaptics();
      }
    };

    startRingingSequence();

    return () => {
      isMounted = false;
      stopAllAudioAndHaptics();
    };
  }, [viewMode]);

  // --- Effect: Handle CONNECTED State ---
  useEffect(() => {
    let timerInterval: any;

    if (viewMode === 'CONNECTED') {
      const textToRead = excuseText || "Hello? Please come home now.";
      
      // 1. Speak Text
      Speech.speak(textToRead, {
        language: 'en-GB', // British Accent
        rate: 0.9,         // Slightly slower for clarity
        pitch: 1.0,
      });

      // 2. Start Visual Timer
      timerInterval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      stopAllAudioAndHaptics();
    };
  }, [viewMode]); 


  // --- Helper Functions ---
  const handleInitiate = async () => {
    // Generate text in background
    generateExcuse(contextInput).then((text) => setExcuseText(text));
    
    // Simulate "Black Screen" delay
    setTimeout(() => {
      setViewMode('RINGING');
    }, 3000);
  };

  const handleAccept = () => {
    setViewMode('CONNECTED');
  };

  const handleDeclineOrEnd = () => {
    setViewMode('SETUP');
    setContextInput('');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- UI RENDERING ---

  // VIEW 1: SETUP
  if (viewMode === 'SETUP') {
    return (
      <SafeAreaView className="bg-black flex-1 justify-center items-center p-6">
        <TextInput
          className="bg-gray-800 text-white w-full p-4 rounded-xl mb-10 text-lg border border-gray-700"
          placeholder="Context (e.g. Boring Date)"
          placeholderTextColor="#9CA3AF"
          value={contextInput}
          onChangeText={setContextInput}
        />
        <TouchableOpacity
          onPress={handleInitiate}
          activeOpacity={0.8}
          className="w-64 h-64 bg-red-600 rounded-full justify-center items-center shadow-2xl active:bg-red-700 border-4 border-red-800"
        >
          <Text className="text-white font-bold text-xl tracking-widest text-center">
            INITIATE{'\n'}PROTOCOL
          </Text>
        </TouchableOpacity>
        <Text className="text-gray-500 mt-8 text-sm italic">
          Ghost Protocol Standby...
        </Text>
      </SafeAreaView>
    );
  }

  // VIEW 2: RINGING
  if (viewMode === 'RINGING') {
    return (
      <View className="bg-gray-900 flex-1 flex-col justify-between py-20 px-10">
        <View className="items-center mt-10">
           {/* Initials Circle */}
           <View className="w-24 h-24 bg-gray-600 rounded-full mb-4 items-center justify-center">
              <Text className="text-4xl">👤</Text>
           </View>
           <Text className="text-white text-5xl font-bold text-center">MUM ❤️</Text>
           <Text className="text-gray-300 text-lg mt-2">Mobile</Text>
        </View>

        <View className="flex-row justify-between w-full mb-10">
          <TouchableOpacity
            onPress={handleDeclineOrEnd}
            className="bg-red-500 w-[75px] h-[75px] rounded-full justify-center items-center shadow-lg"
          >
             <Text className="text-white font-bold text-xs">DECLINE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleAccept}
            className="bg-green-500 w-[75px] h-[75px] rounded-full justify-center items-center shadow-lg animate-pulse"
          >
            <Text className="text-white font-bold text-xs">ACCEPT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // VIEW 3: CONNECTED
  if (viewMode === 'CONNECTED') {
    return (
      <SafeAreaView className="bg-black flex-1 items-center pt-24">
         <View className="items-center mb-16">
            <Text className="text-white text-3xl font-bold mb-2">MUM ❤️</Text>
            <Text className="text-white text-2xl tracking-widest">{formatTime(callTimer)}</Text>
         </View>

         {/* Call Action Grid */}
         <View className="flex-row flex-wrap justify-center w-full gap-x-8 gap-y-6 px-6">
            {['Mute', 'Keypad', 'Speaker', 'Add Call', 'FaceTime', 'Contacts'].map((icon) => (
              <View key={icon} className="items-center w-20">
                <View className="w-16 h-16 bg-gray-800 rounded-full justify-center items-center mb-2 bg-opacity-60 border border-gray-700">
                  <Text className="text-white text-lg font-bold opacity-50">#</Text>
                </View>
                <Text className="text-white text-xs">{icon}</Text>
              </View>
            ))}
         </View>

        <TouchableOpacity
          onPress={handleDeclineOrEnd}
          className="bg-red-600 w-20 h-20 rounded-full justify-center items-center mb-10 mt-auto shadow-xl"
        >
           {/* Phone Hangup Icon Shape */}
           <View className="w-10 h-4 bg-white rounded-full" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return null;
}