'use client'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import React, { useState } from 'react'
import AddNewSessionDialog from './AddNewSessionDialog'

const HistoryList = () => {
    const [history,setHistory] = useState([])
    const text = "+ Start a Consultation"
  return (
    <div>
        {history.length ==0  ?
        <div className='flex justify-center flex-col items-center p-7 border border-dashed border-gray-300 rounded-lg mt-5'>
            <Image src={'/medical-assistance.png'} alt='Medical Assistance' width={150} height={150}/>
            <h2 className='font-bold text-xl mt-5'>No Recent Consultants</h2>
            <p>Please consult with a doctor for more information.</p>
            <AddNewSessionDialog text={text}/>
        </div>
        :
        <div>List</div>    
    }
    </div>
  )
}

export default HistoryList