"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DialogClose } from "@radix-ui/react-dialog";
import axios from "axios";
import { ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import DoctorAgentCard, { DoctorAgent } from "./DoctorAgentCard";
import SuggestedDoctorCard from "./SuggestedDoctorCard";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { SessionDetails } from "../medical-agent/[sessionId]/page";
interface AddNewSessionDialogProps {
  text: string;
}
const AddNewSessionDialog: React.FC<AddNewSessionDialogProps> = ({ text }) => {
  const [note, setNote] = useState<string>();
  const [loading, setloading] = useState(false);
  const [suggestedDoctors, setSuggestedDoctors] = useState<DoctorAgent[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorAgent>();
  const [history,setHistory] = useState<SessionDetails[]>([])
  const router = useRouter()
  const { has } = useAuth()
  //@ts-ignore
  const paidUser = has && has({ plan: 'pro' })
  useEffect(() => {
        getHistoryList()
      }, [])
      
      const getHistoryList=async()=>{
        const result = await axios.get('/api/session-chat?sessionId=all')
        console.log(result.data);
        setHistory(result.data)
      }
      
  const onClickNext = async () => {
    setloading(true);
    const result = await axios.post("/api/suggest-doctors", {
      notes: note,
    });
    console.log(result.data);
    setSuggestedDoctors(result.data);
    setloading(false);
  };
  const startConsultation = async () => {
    if (!selectedDoctor) {
      console.error("❌ No doctor selected");
      return;
    }

    setloading(true);
    try {
      const result = await axios.post("/api/session-chat", {
        notes: note,
        selectedDoctor,
      });
      console.log(result.data);
      if (result.data?.sessionId) {
        console.log(result.data.sessionId);
        router.push(`/dashboard/medical-agent/${result.data.sessionId}`);
      }
    } catch (err) {
      console.error("❌ API /session-chat failed:", err);
    } finally {
      setloading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger>
        <Button className="mt-5 mb-4" disabled={!paidUser && history?.length>=1}>{text}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Basic Details</DialogTitle>
          <DialogDescription asChild>
            {suggestedDoctors.length == 0 ? (
              <div>
                <h2>Add Symptoms or Any Other Details</h2>
                <Textarea
                  value={note}
                  className="h-[200px] mt-2"
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add Detail here..."
                />
              </div>
            ) : (
              <div>
                <h2>Select the Doctor</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 w-full">
                  {suggestedDoctors.map((doc, idx) => (
                    <SuggestedDoctorCard
                      key={idx}
                      doctorAgent={doc}
                      setSelectedDoctor={() => setSelectedDoctor(doc)}
                      selectedDoctor={selectedDoctor}
                    />
                  ))}
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>
            <Button variant={"outline"}>Cancel</Button>
          </DialogClose>
          {suggestedDoctors.length == 0 ? (
            <Button disabled={!note || loading} onClick={onClickNext}>
              Next{" "}
              {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
            </Button>
          ) : (
            <Button
              disabled={loading || !selectedDoctor}
              onClick={() => startConsultation()}
            >
              Start Consultation{" "}
              {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewSessionDialog;
