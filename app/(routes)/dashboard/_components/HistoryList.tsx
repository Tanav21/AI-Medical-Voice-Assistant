'use client'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import AddNewSessionDialog from './AddNewSessionDialog'
import axios from 'axios'
import HistoryTable from './HistoryTable'
import { SessionDetails } from '../medical-agent/[sessionId]/page'
import { Loader2 } from 'lucide-react'

const HistoryList = () => {
  const [history, setHistory] = useState<SessionDetails[]>([])
  const [loading, setLoading] = useState(false)
  const text = "+ Start a Consultation"

  useEffect(() => {
    getHistoryList()
  }, [])

  const getHistoryList = async () => {
    setLoading(true)
    try {
      const result = await axios.get('/api/session-chat?sessionId=all')
      setHistory(result.data)
    } catch (err) {
      console.error("Failed to fetch session history:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[300px] w-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div>
      {history.length === 0 ? (
        <div className="flex justify-center flex-col items-center p-7 border border-dashed border-gray-300 rounded-lg mt-5">
          <Image src={'/medical-assistance.png'} alt='Medical Assistance' width={150} height={150} />
          <h2 className="font-bold text-xl mt-5">No Recent Consultants</h2>
          <p>Please consult with a doctor for more information.</p>
          <AddNewSessionDialog text={text} />
        </div>
      ) : (
        <div>
          <HistoryTable historyList={history} />
        </div>
      )}
    </div>
  )
}

export default HistoryList
