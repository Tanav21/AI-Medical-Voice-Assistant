'use client'
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '@clerk/nextjs';
import { UserDetailContext } from './context/UserDetailContext';

interface ProviderProps {
  children: React.ReactNode;
}

export type UserDetail = {
  name: string;
  email: string;
  credits: number;
};

const Provider: React.FC<ProviderProps> = ({ children }) => {
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      createNewUser();
    }
  }, [isLoaded, user?.id]); // only run when user loads

  const createNewUser = async () => {
    try {
      const res = await axios.post('/api/users');
      console.log("Response from API:", res.data);
      setUserDetail(res.data);
    } catch (err) {
      console.error("Error creating user:", err);
    }
  };

  return (
    <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
      {children}
    </UserDetailContext.Provider>
  );
};

export default Provider;
