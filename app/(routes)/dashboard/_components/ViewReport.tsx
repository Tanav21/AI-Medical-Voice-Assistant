import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import moment from 'moment'
import { SessionDetails } from '../medical-agent/[sessionId]/page'

type Report = {
  sessionId: string;
  agent: string;
  user: string;
  timestamp: string | number;
  chiefComplaint: string;
  summary: string;
  duration?: string;
  severity?: string;
  symptoms: string[];
  medicationsMentioned: string[];
  recommendations: string[];
};

type SessionDetailsWithReport = Omit<SessionDetails, 'report'> & { report: Report };

type Props = {
  record: SessionDetailsWithReport;
};

const InfoBlock = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-5 shadow-sm">
    <h3 className="text-blue-700 text-lg font-semibold mb-3">{title}</h3>
    <div className="text-sm space-y-2">{children}</div>
  </div>
);

const LabeledText = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
  <p>
    <span className="font-medium">{label}:</span> {value}
  </p>
);

const ViewReport = ({ record }: Props) => {
  const { report } = record;

  if (!report) {
    return (
      <Dialog>
        <DialogTrigger>
          <Button variant="link" size="sm">View Report</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Not Available</DialogTitle>
            <DialogDescription>
              <p className="text-center text-sm text-gray-500 mt-2">
                No report was generated for this session.
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div>
      <Dialog>
        <DialogTrigger>
          <Button variant="link" size="sm">View Report</Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>
              <h2 className="text-center text-2xl font-bold text-gray-800">
                Medical AI Voice Agent Report
              </h2>
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-6 mt-4 px-1">
                
                <InfoBlock title="Video Info">
                  <LabeledText label="Doctor Specialization" value={record.selectedDoctor?.specialist ?? "Unknown"} />
                  <LabeledText label="Consultation Date" value={moment(record.createdOn).format('LLL')} />
                </InfoBlock>

                <InfoBlock title="Session Info">
                  <LabeledText label="Session ID" value={report.sessionId} />
                  <LabeledText label="AI Agent" value={report.agent} />
                  <LabeledText label="User" value={report.user} />
                  <LabeledText label="Timestamp" value={moment(report.timestamp).format('LLL')} />
                </InfoBlock>

                <InfoBlock title="Complaint & Summary">
                  <LabeledText label="Chief Complaint" value={report.chiefComplaint} />
                  <LabeledText label="Summary" value={report.summary} />
                </InfoBlock>

                <InfoBlock title="Details">
                  <LabeledText label="Duration" value={report.duration || 'Not mentioned'} />
                  <LabeledText label="Severity" value={report.severity || 'Not mentioned'} />
                  <LabeledText
                    label="Symptoms"
                    value={report.symptoms?.length ? report.symptoms.join(", ") : "None mentioned"}
                  />
                  <LabeledText
                    label="Medications Mentioned"
                    value={report.medicationsMentioned?.length
                      ? report.medicationsMentioned.join(", ")
                      : "None"}
                  />
                </InfoBlock>

                <InfoBlock title="Recommendations">
                  {report.recommendations?.length ? (
                    <ul className="list-disc ml-6 text-sm text-gray-700">
                      {report.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No specific recommendations</p>
                  )}
                </InfoBlock>

              </div>
            </DialogDescription>
<p className="text-center text-xs text-gray-500">
  This is an AI-generated report. Please consult a licensed medical professional for a proper diagnosis and treatment.
</p>

          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewReport;
