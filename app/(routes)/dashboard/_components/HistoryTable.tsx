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

type Props = {
  historyList: SessionDetails[];
};

const HistoryTable = ({ historyList }: Props) => {
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
              <TableCell className="font-medium text-gray-800">
                {record?.selectedDoctor?.specialist}
              </TableCell>
              <TableCell className="text-gray-700 max-w-sm truncate">
                {record.notes}
              </TableCell>
              <TableCell className="text-gray-600">
                {moment(new Date(record.createdOn)).fromNow()}
              </TableCell>
              <TableCell className="text-right">
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
