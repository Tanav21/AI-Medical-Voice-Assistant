import { AIDoctorAgents } from '@/shared/list'
import React from 'react'
import DoctorAgentCard from './DoctorAgentCard'

const DoctorAgentList = () => {
  return (
    <div className='mt-10 '>
        <h2 className='font-bold text-xl'>AI Specialist Doctor</h2>
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 mt-5'>
            {AIDoctorAgents.map((items,index)=>(
                <div key={index}>
                    <DoctorAgentCard doctorAgent={items}/>
                </div>
            ))}
        </div>
    </div>
  )
}

export default DoctorAgentList