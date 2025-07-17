import React from 'react'
import { DoctorAgent } from './DoctorAgentCard'
import Image from 'next/image'

type props = {
  doctorAgent: DoctorAgent
  setSelectedDoctor: any
  selectedDoctor: DoctorAgent | undefined
}

const SuggestedDoctorCard = ({ doctorAgent, setSelectedDoctor, selectedDoctor }: props) => {
  return (
    <div
      className={`flex flex-col items-center gap-2 border rounded-xl shadow-md p-4 hover:border-blue-500 transition-all cursor-pointer 
      w-full sm:w-40 md:w-48 text-center justify-between mt-3
      ${selectedDoctor?.id === doctorAgent.id ? 'border-blue-500' : 'border-gray-300'}`}
      onClick={() => setSelectedDoctor(doctorAgent)}
    >
      <Image
        src={doctorAgent.image}
        alt={doctorAgent.specialist}
        width={70}
        height={70}
        className="w-[60px] h-[60px] md:w-[70px] md:h-[70px] rounded-full object-cover"
      />
      <h2 className="text-sm md:text-base font-semibold">{doctorAgent.specialist}</h2>
      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
        {doctorAgent.description}
      </p>
    </div>
  )
}

export default SuggestedDoctorCard
