import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/authAPI';

interface GymLocation {
    id: number;
    name: string;
    code: string;
    timezone: string;
}

interface GymContextType {
    currentGym: GymLocation | null;
    setCurrentGym: (gym: GymLocation) => void;
    availableGyms: GymLocation[];
    loading: boolean;
    refreshGyms: () => Promise<void>;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export function GymProvider({ children }: { children: React.ReactNode }) {
    const [currentGym, setCurrentGym] = useState<GymLocation | null>(null);
    const [availableGyms, setAvailableGyms] = useState<GymLocation[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshGyms = async () => {
        try {
            setLoading(true);
            // NOTE: We need to create this endpoint in the backend!
            // For now, let's assume we fetch it via a new endpoint or hardcode the migration result if endpoint fails
            // Temporarily mocking the fetch to match our migration data
            const gyms: GymLocation[] = [
                { id: 1, name: 'UREC Main Campus', code: 'MAIN', timezone: 'America/New_York' }
            ];

            // TODO: const response = await api.get('/gyms'); // Future implementation

            setAvailableGyms(gyms);

            // Auto-select logic
            const storedGymId = await AsyncStorage.getItem('currentGymId');
            if (storedGymId) {
                const matched = gyms.find(g => g.id.toString() === storedGymId);
                if (matched) {
                    setCurrentGym(matched);
                } else if (gyms.length === 1) {
                    setCurrentGym(gyms[0]);
                    await AsyncStorage.setItem('currentGymId', gyms[0].id.toString());
                }
            } else {
                if (gyms.length === 1) {
                    setCurrentGym(gyms[0]);
                    await AsyncStorage.setItem('currentGymId', gyms[0].id.toString());
                }
            }
        } catch (e) {
            console.error("Failed to load gyms", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshGyms();
    }, []);

    const updateGym = async (gym: GymLocation) => {
        setCurrentGym(gym);
        await AsyncStorage.setItem('currentGymId', gym.id.toString());
    };

    return (
        <GymContext.Provider value={{
            currentGym,
            setCurrentGym: updateGym,
            availableGyms,
            loading,
            refreshGyms
        }}>
            {children}
        </GymContext.Provider>
    );
}

export function useGym() {
    const context = useContext(GymContext);
    if (context === undefined) {
        throw new Error('useGym must be used within a GymProvider');
    }
    return context;
}
