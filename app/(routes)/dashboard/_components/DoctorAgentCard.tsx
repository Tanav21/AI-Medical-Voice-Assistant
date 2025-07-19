'use client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import { ArrowRightIcon, Loader2, Lock } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { SessionDetails } from '../medical-agent/[sessionId]/page'

export type DoctorAgent = {
    id: number,
    specialist: string,
    description: string,
    image: string,
    agentPrompt: string,
    voiceId?: string,
    subscriptionRequired: boolean
}

type props = {
    doctorAgent: DoctorAgent
}

const DoctorAgentCard = ({ doctorAgent }: props) => {
    const [loading, setLoading] = useState(false)
    const { has } = useAuth()
    const router = useRouter()
    const [history, setHistory] = useState<SessionDetails[]>([]);
    //@ts-ignore
    const paidUser = has && has({ plan: 'pro' })

    const isLocked = doctorAgent.subscriptionRequired && !paidUser
const startConsultation = async () => {
    setLoading(true);
    try {
      const result = await axios.post("/api/session-chat", {
        notes: "Call with AI Agent",
        selectedDoctor:doctorAgent,
      });
      console.log(result.data);
      if (result.data?.sessionId) {
        console.log(result.data.sessionId);
        router.push(`/dashboard/medical-agent/${result.data.sessionId}`);
      }
    } catch (err) {
      console.error("❌ API /session-chat failed:", err);
    } finally {
      setLoading(false);
    }
  };
    return (
        <div className={`h-[380px] flex flex-col justify-between relative ${isLocked ? 'backdrop-blur-sm opacity-60 pointer-events-none' : ''}`}>
            {doctorAgent.subscriptionRequired == true && (
                <div className='absolute right-0'>
                    <Badge>Premium</Badge>
                </div>
            )}
            <Image
                src={doctorAgent.image}
                alt={doctorAgent.specialist}
                width={200}
                height={300}
                className='w-full h-[250px] object-cover rounded-xl'
            />
            <h2 className='font-bold'>{doctorAgent.specialist}</h2>
            <p className='line-clamp-2 text-sm text-gray-500'>{doctorAgent.description}</p>

            <Button
                className="w-full mt-2 flex items-center justify-center gap-2"
                disabled={isLocked || history.length>=1}
                onClick={startConsultation}
            >
                Start Consultation
                {loading ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                ) : isLocked ? (
                    <Lock className="h-4 w-4" />
                ) : (
                    <ArrowRightIcon className="h-4 w-4" />
                )}
            </Button>
        </div>
    )
}

export default DoctorAgentCard
