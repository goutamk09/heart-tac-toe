import { useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage";
import LobbyPage from "./pages/LobbyPage";
import MatchPage from "./pages/MatchPage";

export default function App() {
  const [username, setUsername] = useState("");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setUsername("");
    setIsLoggedIn(false);
    setMatchId(null);
  }, []);

  const handleLogin = (name: string) => {
    setUsername(name);
    setIsLoggedIn(true);
  };

  const handleLeaveMatch = () => {
    setMatchId(null);
  };

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLogin} />;
  }

  if (!matchId) {
    return (
      <LobbyPage
        username={username}
        onMatchCreated={(id) => setMatchId(id)}
      />
    );
  }

  return (
    <MatchPage
      username={username}
      matchId={matchId}
      onLeave={handleLeaveMatch}
    />
  );
}