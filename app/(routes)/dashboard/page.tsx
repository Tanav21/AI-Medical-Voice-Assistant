import React from 'react'
import HistoryList from './_components/HistoryList'
import { Button } from '@/components/ui/button'
import DoctorAgentList from './_components/DoctorAgentList'
import AddNewSessionDialog from './_components/AddNewSessionDialog'

const Dashboard = () => {
  const text = "+ Consult a Doctor"
  return (
    <div>
      <div className='flex items-center justify-between'>
      <h2 className='text-2xl font-bold'>My Dashboard</h2>
      <AddNewSessionDialog text={text}/>
      </div>
      <HistoryList/>
      <DoctorAgentList/>
    </div>
  )
}

export default Dashboard