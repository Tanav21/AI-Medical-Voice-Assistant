import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SessionDetails } from "../medical-agent/[sessionId]/page";
import moment from "moment";
import ViewReport from "./ViewReport";
import { useTheme } from "next-themes";

type Props = {
  historyList: SessionDetails[];
};

const HistoryTable = ({ historyList }: Props) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <div className="rounded-2xl border border-gray-200 shadow-md overflow-x-auto">
      <Table>
        <TableCaption className="text-muted-foreground mt-4 mb-2">
          Previous Consultation Reports
        </TableCaption>
        <TableHeader>
          <TableRow className="bg-gray-100">
            <TableHead className="font-semibold text-gray-700">AI Medical Specialist</TableHead>
            <TableHead className="font-semibold text-gray-700">Description</TableHead>
            <TableHead className="font-semibold text-gray-700">Date</TableHead>
            <TableHead className="text-right font-semibold text-gray-700">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {historyList.map((record: SessionDetails, idx: number) => (
            <TableRow
              key={idx}
              className="hover:bg-gray-50 transition-all duration-150"
            >
              <TableCell className={`font-medium ${isDark? "text-gray-300 bg-black" :"text-gray-800"}`}>
                {record?.selectedDoctor?.specialist}
              </TableCell>
              <TableCell className={`${isDark?"text-gray-400 bg-black":"text-gray-700"} max-w-sm truncate`}>
                {record.notes}
              </TableCell>
              <TableCell className={`${isDark?"text-gray-400 bg-black":"text-gray-60"}`}>
                {moment(new Date(record.createdOn)).fromNow()}
              </TableCell>
              <TableCell className={`text-right ${isDark?"bg-black":"bg-white"}`}>
                <ViewReport record={record as any} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default HistoryTable;
