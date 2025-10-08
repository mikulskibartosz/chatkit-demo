import { useState } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";

const STORAGE_KEY = "chatkit-device-id";
const SESSION_ENDPOINT = "/api/chatkit/session";

function useDeviceId(): string {
  const [deviceId] = useState(() => {
    if (typeof window === "undefined") {
      return "server";
    }

    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  });

  return deviceId;
}

type SessionResponse = {
  client_secret?: string;
  error?: string;
};

export default function App() {
  const deviceId = useDeviceId();

  const { control } = useChatKit({
    api: {
      async getClientSecret(existing) {
        if (existing) {
          return existing;
        }

        const response = await fetch(SESSION_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user: deviceId,
          }),
        });

        const payload = (await response
          .json()
          .catch(() => null)) as SessionResponse | null;

        const clientSecret = payload?.client_secret;
        const errorMessage = payload?.error;

        if (!response.ok || typeof clientSecret !== "string") {
          throw new Error(errorMessage ?? "Failed to create ChatKit session.");
        }

        return clientSecret;
      },
    },
  });

  return (
    <main className="flex min-h-screen flex-col bg-white text-black">
      <header className="border-b border-slate-200 px-6 py-4 text-xl font-semibold">
        Ask mikulskibartosz.name
      </header>
      <div className="flex flex-1 justify-center p-6">
        <ChatKit control={control} className="h-full max-w-[800px] flex-1" />
      </div>
    </main>
  );
}
