import { Button } from '@/components/ui/button'
import { IconArrowRight, IconSignRight, IconSTurnRight } from '@tabler/icons-react'
import Image from 'next/image'
import React from 'react'

export type DoctorAgent = {
    id:number,
    specialist:string,
    description:string,
    image:string
    agentPrompt:string,
    voiceId?:string
}

type props={
    doctorAgent:DoctorAgent
}
const DoctorAgentCard = ({doctorAgent}:props) => {
  return (
    <div className="h-[380px] flex flex-col justify-between">
        <Image src={doctorAgent.image} alt={doctorAgent.specialist} width={200} height={300} className='w-full h-[250px] object-cover rounded-xl'/>
        <h2 className='font-bold'>{doctorAgent.specialist}</h2>
        <p className='line-clamp-2 text-sm text-gray-500'>{doctorAgent.description}</p>
        <Button className='w-full mt-2'>Start Consultation <IconArrowRight/></Button>
    </div>
  )
}

export default DoctorAgentCard