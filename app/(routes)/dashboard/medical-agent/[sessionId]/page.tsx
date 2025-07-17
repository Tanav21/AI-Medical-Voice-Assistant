"use client";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { DoctorAgent } from "../../_components/DoctorAgentCard";
import { Circle, PhoneCall, PhoneOff, Loader2, Loader } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Vapi from "@vapi-ai/web";
import { toast } from "sonner";

type SessionDetails = {
  id: number;
  sessionId: string;
  notes: string;
  report: JSON;
  selectedDoctor: DoctorAgent;
  createdOn: string;
};

type messages = {
  role: string;
  text: string;
};

const MedicalVoiceAgent = () => {
  const { sessionId } = useParams();
  const [sessionDetails, setSessionDetails] = React.useState<SessionDetails>();
  const [vapiInstance, setVapiInstance] = React.useState<Vapi>();
  const [callStarted, setCallStarted] = React.useState(false);
  const [currentRole, setCurrentRole] = React.useState<string | null>();
  const [liveTranscripts, setLiveTranscripts] = React.useState<string>();
  const [message, setmessage] = useState<messages[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter()

  useEffect(() => {
    sessionId && GetSessionDetails();
  }, [sessionId]);

  const GetSessionDetails = async () => {
    const res = await axios.get("/api/session-chat?sessionId=" + sessionId);
    console.log(res.data);
    setSessionDetails(res.data);
  };

  const startCall = () => {
    setLoading(true);
    const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_API_KEY!);
    setVapiInstance(vapi);

    const VapiAgentConfig = {
      name: "Ai Medical Doctor Voice Agent",
      firstMessage:
        "Hi there! I'm your AI Medical Assistant. I am here to help you with any health questions or concerns you might have today. How are you feeling?",
      transcriber: {
        provider: "assembly-ai",
        language: "en",
      },
      voice: {
        provider: "playht",
        voiceId: sessionDetails?.selectedDoctor.voiceId,
      },
      model: {
        provider: "google",
        model: "gemini-2.0-flash",
        messages: [
          {
            role: "system",
            content: sessionDetails?.selectedDoctor?.agentPrompt,
          },
        ],
      },
    };

    //@ts-ignore
    vapi.start(VapiAgentConfig);

    vapi.on("call-start", () => {
      console.log("Call started");
      setCallStarted(true);
      setLoading(false);
    });

    vapi.on("call-end", () => {
      console.log("Call ended");
      setCallStarted(false);
    });

    vapi.on("message", (message) => {
      if (message.type === "transcript") {
        const { role, transcriptType, transcript } = message;
        console.log(`${message.role}: ${message.transcript}`);
        if (transcriptType == "partial") {
          setLiveTranscripts(transcript);
          setCurrentRole(role);
        } else if (transcriptType == "final") {
          setmessage((prev: messages[] = []) => [
            ...prev,
            { role: role, text: transcript },
          ]);
          setLiveTranscripts("");
          setCurrentRole(null);
        }
      }
    });

    if (vapiInstance) {
      vapiInstance.on("speech-start", () => {
        console.log("Assistant started speaking");
        setCurrentRole("assistant");
      });
      vapiInstance.on("speech-end", () => {
        console.log("Assistant stopped speaking");
        setCurrentRole("user");
      });
    }
  };

  const endCall = async () => {
    setLoading(true);

    if (!vapiInstance) return;

    vapiInstance.stop();

    vapiInstance.off("call-start", () => {
      console.log("Call started");
      setCallStarted(true);
    });

    vapiInstance.off("call-end", () => {
      console.log("Call ended");
      setCallStarted(false);
    });

    vapiInstance.off("message", (message) => {
      if (message.type === "transcript") {
        console.log(`${message.role}: ${message.transcript}`);
      }
    });

    setCallStarted(false);
    setVapiInstance(undefined);

    const result = await generateReport();

    setLoading(false)
    toast.success("Your report is generated Successfully!");
    router.replace("/dashboard")
  };

  const generateReport = async () => {
    const result = await axios.post("/api/medical-report", {
      message: message,
      sessionDetails: sessionDetails,
      sessionId: sessionId,
    });
  };

  return (
    <div className="p-5 border rounded-3xl bg-secondary shadow-md">
      <div className="flex items-center justify-between p-4">
        <h2 className="p-1 px-2 border rounded-md flex gap-2 items-center">
          <Circle
            className={`h-4 w-4 rounded-full text-white ${
              callStarted ? "bg-green-500" : "bg-red-500"
            }`}
          />
          {callStarted ? "Connected" : "Not Connected"}
        </h2>
        <h2 className="font-bold text-xl text-gray-400 ">00:00</h2>
      </div>

      {sessionDetails && (
        <div className="flex flex-col items-center mt-10">
          <Image
            src={sessionDetails?.selectedDoctor?.image}
            alt={sessionDetails?.selectedDoctor?.specialist}
            height={80}
            width={80}
            className="w-[100px] h-[100px] object-cover rounded-full"
          />
          <h2 className="mt-2 text-lg">
            {sessionDetails?.selectedDoctor?.specialist}
          </h2>
          <p className="text-sm text-gray-400">AI Medical Voice Agent</p>

          <div className="mt-32 overflow-y-auto flex flex-col items-center px-10 md:px-28 lg:px-52 xl:px-72">
            {message?.slice(-4).map((msg, index) => (
              <h2 className="text-gray-400 p-1 text-center" key={index}>
                {msg.role} : {msg.text}
              </h2>
            ))}
            {liveTranscripts && liveTranscripts?.length > 0 && (
              <h2 className="text-lg">
                {currentRole} : {liveTranscripts}
              </h2>
            )}
          </div>

          {!callStarted ? (
            <Button
              className="mt-20"
              onClick={startCall}
              disabled={callStarted || loading}
            >
              {loading ? (
                <Loader className="animate-spin" />
              ) : (
                <>
                  <PhoneCall className="mr-2 h-4 w-4" />
                  Start Call
                </>
              )}
            </Button>
          ) : (
            <Button
              className="mt-20"
              onClick={endCall}
              variant={"destructive"}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <PhoneOff className="mr-2 h-4 w-4" />
                  Disconnect
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default MedicalVoiceAgent;
