import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const user = await currentUser();
    try{
        // console.log(user?.primaryEmailAddress)
        //@ts-ignore
        const users = await db.select().from(usersTable).where(eq(usersTable.email, user?.primaryEmailAddress?.emailAddress));
        if(users.length == 0) {
            const result = await db.insert(usersTable).values({
                //@ts-ignore
                name: user?.fullName,
                email: user?.primaryEmailAddress?.emailAddress,
                credits:10
                //@ts-ignore
            }).returning({usersTable});
            return NextResponse.json(result[0]?.usersTable);
        }
        return NextResponse.json( {user:users[0]} , { status: 201 });
    }catch(err){
        console.error("Error fetching user:", err);
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
}