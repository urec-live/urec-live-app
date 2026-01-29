import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { adminAPI, Machine } from '../../services/adminAPI';
import { userAPI } from '../../services/userAPI';
import { ThemedView } from '@/components/themed-view';

interface UserResult {
    id: number;
    username: string;
    email: string;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        loadMachines();
    }, []);

    const loadMachines = async () => {
        try {
            setLoading(true);
            const data = await adminAPI.getAllMachines();
            setMachines(data);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: number, name: string) => {
        Alert.alert(
            'Delete Machine',
            `Are you sure you want to delete "${name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await adminAPI.deleteMachine(id);
                            loadMachines(); // Reload list
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        }
                    },
                },
            ]
        );
    };

    const handleStatusUpdate = async (status: string) => {
        if (!selectedMachine) return;
        try {
            await adminAPI.updateMachineStatus(selectedMachine.id, status);
            setStatusModalVisible(false);
            loadMachines(); // Refresh list to show new status
        } catch (error: any) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        try {
            setSearchLoading(true);
            const results = await userAPI.searchUsers(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error(error);
        } finally {
            setSearchLoading(false);
        }
    };

    const openStatusModal = (machine: Machine) => {
        setSelectedMachine(machine);
        setStatusModalVisible(true);
    };

    const renderItem = ({ item }: { item: Machine }) => (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <Text style={styles.machineName}>{item.name}</Text>
                <Text style={styles.machineCode}>{item.code}</Text>
                <Pressable onPress={() => openStatusModal(item)}>
                    <Text style={[styles.statusBadget, {
                        color: item.status === 'AVAILABLE' ? '#4CAF50' :
                            item.status === 'IN_USE' ? '#FFC107' : '#F44336'
                    }]}>
                        {item.status} <MaterialCommunityIcons name="chevron-down" size={12} />
                    </Text>
                </Pressable>
            </View>
            <View style={styles.actions}>
                <Pressable
                    style={styles.actionButton}
                    onPress={() => router.push({ pathname: '/admin/edit', params: { id: item.id } })}
                >
                    <MaterialCommunityIcons name="pencil" size={20} color="#4CAF50" />
                </Pressable>
                <Pressable
                    style={styles.actionButton}
                    onPress={() => handleDelete(item.id, item.name)}
                >
                    <MaterialCommunityIcons name="delete" size={20} color="#ff4444" />
                </Pressable>
            </View>
        </View>
    );

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Admin Dashboard</Text>
                <Pressable style={styles.addButton} onPress={() => router.push('/admin/create')}>
                    <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                    <Text style={styles.addButtonText}>Add New</Text>
                </Pressable>
            </View>

            <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="account-search" size={20} color="#666" />
                <Text style={styles.sectionTitle}>User Search</Text>
            </View>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search username or email..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                />
                <Pressable style={styles.searchButton} onPress={handleSearch}>
                    {searchLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
                    )}
                </Pressable>
            </View>

            {searchResults.length > 0 && (
                <View style={styles.resultsList}>
                    {searchResults.map(user => (
                        <View key={user.id} style={styles.userRow}>
                            <Text style={styles.username}>{user.username}</Text>
                            <Text style={styles.email}>{user.email}</Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                <MaterialCommunityIcons name="dumbbell" size={20} color="#666" />
                <Text style={styles.sectionTitle}>Equipment</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={machines}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.emptyText}>No machines found.</Text>}
                />
            )}

            <Modal visible={statusModalVisible} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setStatusModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Set Status: {selectedMachine?.name}</Text>
                        {['AVAILABLE', 'MAINTENANCE', 'BROKEN', 'RESERVED'].map(status => (
                            <Pressable
                                key={status}
                                style={styles.modalOption}
                                onPress={() => handleStatusUpdate(status)}
                            >
                                <Text style={styles.optionText}>{status}</Text>
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#666',
        textTransform: 'uppercase',
    },
    searchContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    searchButton: {
        backgroundColor: '#4CAF50',
        padding: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultsList: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#eee',
    },
    userRow: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    username: {
        fontWeight: '700',
        color: '#333',
    },
    email: {
        color: '#666',
        fontSize: 12,
    },
    addButton: {
        backgroundColor: '#4CAF50',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 4,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    list: {
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardContent: {
        flex: 1,
    },
    machineName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    machineCode: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    statusBadget: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: '700',
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: '#f5f5f5',
        alignSelf: 'flex-start',
        borderRadius: 4,
        overflow: 'hidden',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        padding: 8,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 40,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        width: '80%',
        borderRadius: 12,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalOption: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    optionText: {
        fontSize: 16,
        color: '#333',
    },
});
