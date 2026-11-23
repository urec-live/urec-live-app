import { isAxiosError } from "axios";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { workoutFriendsAPI } from "@/services/workoutFriendsAPI";
import { disableNudgeNotifications, enableNudgeNotifications, getNudgeToken } from "@/services/workoutNudgeNotifications";

const quotes = [
  "The dumbbells asked about you.",
  "One rep closer to your dramatic training montage.",
  "The treadmill misses our awkward eye contact.",
  "I believe in you. So does the water bottle you bought.",
  "Want to go together? I promise to pretend the warm-up is easy.",
];

export default function WorkoutFriends({ username, target }: { username: string; target: number }) {
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof workoutFriendsAPI.overview>>>();
  const [notifications, setNotifications] = useState(false);
  const [adding, setAdding] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [recipient, setRecipient] = useState<string>();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [available, setAvailable] = useState(true);
  const refreshId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++refreshId.current;
    try {
      const next = await workoutFriendsAPI.overview();
      if (id !== refreshId.current) return;
      setOverview(next);
      setAvailable(true);
    } catch {
      if (id === refreshId.current) setAvailable(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
    void getNudgeToken(username).then((token) => setNotifications(!!token)).catch(() => {});
    const timer = setInterval(() => void refresh(), 30_000);
    return () => {
      clearInterval(timer);
      refreshId.current++;
    };
  }, [refresh, username]));

  async function act(action: () => Promise<unknown>, success?: string) {
    if (pending) return;
    setPending(true);
    setFeedback("");
    try {
      await action();
      if (success) setFeedback(success);
      await refresh();
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      setFeedback(status === 404 ? "No matching member or request found."
        : status === 429 ? "You can nudge this friend once every 24 hours."
        : "That didn't go through. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.heading}>Friends</Text>
        <Action label={adding ? "Cancel" : "Add friend"} disabled={pending}
          onPress={() => setAdding(!adding)} />
      </View>
      {adding && (
        <View style={styles.row}>
          <TextInput style={styles.input} placeholder="Friend’s username" accessibilityLabel="Friend’s username"
            autoCapitalize="none" autoCorrect={false} maxLength={100} value={friendName} onChangeText={setFriendName} />
          <Action label="Send request" disabled={pending || !friendName.trim() || friendName.trim() === username}
            onPress={() => void act(async () => {
              await workoutFriendsAPI.request(friendName.trim());
              setFriendName("");
              setAdding(false);
            }, "Friend request sent.")} />
        </View>
      )}
      {!available && <Action label="Friends unavailable. Retry" onPress={() => void refresh()} />}
      {overview && (
        <>
          <View style={styles.row}>
            <Text style={styles.text}>Share my weekly progress</Text>
            <Switch accessibilityLabel="Share my weekly progress" value={overview.sharing} disabled={pending}
              onValueChange={(share) => void act(() => workoutFriendsAPI.share(share, target))} />
          </View>
          {Platform.OS !== "web" && (
            <View style={styles.row}>
              <Text style={styles.text}>Workout nudge notifications</Text>
              <Switch accessibilityLabel="Workout nudge notifications" value={notifications} disabled={pending}
                onValueChange={(enable) => void act(async () => {
                  if (enable && !(await enableNudgeNotifications(username))) {
                    setFeedback("Allow notifications in your device settings to receive nudges.");
                    return;
                  }
                  if (!enable) await disableNudgeNotifications(username);
                  setNotifications(enable);
                })} />
            </View>
          )}
          {!overview.friends.length && <Text style={styles.text}>Add a friend to follow each other’s weekly goals.</Text>}
          {overview.friends.map((friend) => {
            const coolingDown = friend.canNudgeAt !== null && Date.parse(friend.canNudgeAt) > Date.now();
            const progress = friend.days !== null && friend.target
              ? Math.min(100, Math.round((friend.days / friend.target) * 100))
              : null;
            return (
              <View key={friend.username} style={styles.friend}>
                <View style={styles.row}>
                  <View style={styles.identity}>
                    <Text style={styles.name}>{friend.username}</Text>
                    <Text style={styles.text}>
                      {friend.status === "INCOMING" ? "Friend request"
                        : friend.status === "OUTGOING" ? "Request sent"
                      : progress === null ? "Progress is private" : "This week"}
                    </Text>
                  </View>
                  {friend.status === "INCOMING" && <Action label="Accept" disabled={pending}
                    onPress={() => void act(() => workoutFriendsAPI.accept(friend.username))} />}
                  {friend.status === "FRIEND" && <Action label={coolingDown ? "Nudged" : "Nudge"}
                    disabled={pending || coolingDown}
                    onPress={() => { setRecipient(friend.username); setDraft(""); }} />}
                  <Action label={friend.status === "INCOMING" ? "Decline" : friend.status === "OUTGOING" ? "Cancel request" : "Remove"}
                    disabled={pending} onPress={() => void act(async () => {
                      await workoutFriendsAPI.remove(friend.username);
                      if (recipient === friend.username) setRecipient(undefined);
                    })} />
                </View>
                {progress !== null && (
                  <View style={styles.progress}>
                    <View style={styles.row}>
                      <Text style={styles.progressCount}>{friend.days} / {friend.target} days</Text>
                      <Text style={styles.percentage}>{progress}%</Text>
                    </View>
                    <View
                      accessibilityRole="progressbar"
                      accessibilityLabel={`${friend.username}'s weekly workout goal`}
                      accessibilityValue={{ min: 0, max: 100, now: progress }}
                      style={styles.track}
                    >
                      <View style={[styles.fill, { width: `${progress}%` }]} />
                    </View>
                  </View>
                )}
                {recipient === friend.username && friend.status === "FRIEND" && (
                  <>
                    <TextInput style={styles.input} placeholder="Write a friendly nudge" accessibilityLabel="Nudge message"
                      multiline maxLength={500} value={draft} onChangeText={setDraft} />
                    <View style={styles.row}>
                      <Action label="Surprise me" disabled={pending} onPress={() => {
                        const choices = quotes.filter((quote) => quote !== draft);
                        setDraft(choices[Math.floor(Math.random() * choices.length)]);
                      }} />
                      <Action label="Cancel" disabled={pending} onPress={() => setRecipient(undefined)} />
                      <Action label="Send nudge" disabled={pending || !draft.trim()}
                        onPress={() => void act(async () => {
                          await workoutFriendsAPI.nudge(friend.username, draft.trim());
                          setRecipient(undefined);
                          setDraft("");
                        }, "Nudge sent in Messages.")} />
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </>
      )}
      {!!feedback && <Text accessibilityLiveRegion="polite" style={styles.text}>{feedback}</Text>}
    </View>
  );
}

function Action({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.button}>
    <Text style={[styles.action, disabled && styles.disabled]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderColor: "#E1E7E3", borderWidth: 1, borderRadius: 16, padding: 16, gap: 8, marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  heading: { color: "#1B3029", fontSize: 17, fontWeight: "700" },
  name: { color: "#1B3029", fontWeight: "700" },
  text: { color: "#43584E", flexShrink: 1 },
  action: { color: "#216C50", fontWeight: "700" },
  button: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  disabled: { color: "#6C7C75" },
  friend: { borderTopColor: "#E1E7E3", borderTopWidth: 1, paddingTop: 8, gap: 8 },
  identity: { flexGrow: 1, flexShrink: 1, minWidth: 100 },
  progress: { gap: 6, paddingBottom: 8 },
  progressCount: { color: "#43584E", fontSize: 12, fontWeight: "500" },
  percentage: { color: "#216C50", fontSize: 14, fontWeight: "700" },
  track: { height: 8, borderRadius: 4, backgroundColor: "#E8F1EB", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4, backgroundColor: "#216C50" },
  input: { minHeight: 44, minWidth: 150, flexGrow: 1, borderColor: "#A9BDB2", borderWidth: 1, borderRadius: 8, padding: 10, color: "#1B3029" },
});
