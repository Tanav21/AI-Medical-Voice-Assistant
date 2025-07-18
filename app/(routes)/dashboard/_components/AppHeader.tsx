'use client'
import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

const AppHeader = () => {
  const menuOptions = [
    {
      id: 1,
      label: "Home",
      path: "/dashboard",
    },
    {
      id: 2,
      label: "History",
      path: "/dashboard/history",
    },
    {
      id: 3,
      label: "Pricing",
      path: "/dashboard/billing",
    },
    {
      id: 4,
      label: "Settings",
      path: "/settings",
    },
  ];
  const router = useRouter()
  const handlepath = (path: string)=>{
    router.replace(path)
  }
  return (
    <div className="flex justify-between items-center p-4 shadow px-10 md:px-20 lg:px-40">
      <Image src="/logo.svg" alt="Logo" width={120} height={100} />
      <div className="hidden md:flex items-center gap-12">
        {menuOptions.map((item, index) => (
          <div key={index}>
            <h2 className="hover:font-bold cursor-pointer transition-all bg-black text-transparent bg-clip-text" onClick={()=>handlepath(item.path)}>{item.label}</h2>
          </div>
        ))}
      </div>
        <UserButton/>
    </div>
  );
};

export default AppHeader;
