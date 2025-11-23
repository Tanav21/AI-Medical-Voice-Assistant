// components/ViewReport.tsx  (or replace your existing file)
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import moment from "moment";
import { SessionDetails } from "../medical-agent/[sessionId]/page";

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
  tests?: string[];
  medicationsRecommended?: string[];
};

type SessionDetailsWithReport = Omit<SessionDetails, "report"> & {
  report: Report;
};

type Props = {
  record: SessionDetailsWithReport;
};

const InfoBlock = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-5 shadow-sm">
    <h3 className="text-blue-700 text-lg font-semibold mb-3">{title}</h3>
    <div className="text-sm space-y-2">{children}</div>
  </div>
);

const LabeledText = ({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactNode;
}) => (
  <p>
    <span className="font-medium">{label}:</span> {value}
  </p>
);

export default function ViewReport({ record }: Props) {
  const { report } = record;

  // Compare dialog state
  const [openCompare, setOpenCompare] = useState(false);
  const [doctorText, setDoctorText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!report) {
    return (
      <Dialog>
        <DialogTrigger>
          <Button variant="link" size="sm">
            View Report
          </Button>
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

  // Handle file input - we accept .txt and .pdf
  const handleFile = async (file: File | null) => {
    setError(null);
    if (!file) return;
    setFileName(file.name);
    // If text file, read client-side
    if (file.type === "text/plain") {
      const text = await file.text();
      setDoctorText(text);
      return;
    }
    // If PDF or other, upload to server for extraction
    const form = new FormData();
    form.append("file", file);
    try {
      setLoading(true);
      const res = await fetch("/api/extract-doctor-report", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to extract file text");
        setDoctorText("");
      } else {
        setDoctorText(data.text || "");
      }
    } catch (e) {
      console.error(e);
      setError("File upload/extraction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    setError(null);
    setCompareResult(null);
    if (!doctorText || doctorText.trim().length < 10) {
      setError(
        "Paste or upload the doctor's report text first (at least 10 characters)."
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/compare-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiReport: report, // send entire AI report object
          doctorReport: doctorText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Comparison failed");
      } else {
        setCompareResult(data);
      }
    } catch (e) {
      console.error(e);
      setError("Comparison request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Dialog open={openCompare} onOpenChange={setOpenCompare}>
        <div className="flex items-center justify-between mb-4">
          <Button variant="link" size="sm" onClick={() => setOpenCompare(true)}>
            View Report
          </Button>

          {/* Compare button outside the main dialog for visibility */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenCompare(true)}
          >
            Compare with Doctor Report
          </Button>
        </div>

        {/* Main View Report dialog content */}
        <DialogContent className="max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>
              <h2 className="text-center text-2xl font-bold text-neutral-100">
                Medical AI Voice Agent Report
              </h2>
            </DialogTitle>

            <DialogDescription asChild>
              <div className="space-y-6 mt-4 px-1">
                <InfoBlock title="Video Info">
                  <LabeledText
                    label="Doctor Specialization"
                    value={record.selectedDoctor?.specialist ?? "Unknown"}
                  />
                  <LabeledText
                    label="Consultation Date"
                    value={moment(record.createdOn).format("LLL")}
                  />
                </InfoBlock>

                <InfoBlock title="Session Info">
                  <LabeledText label="Session ID" value={report.sessionId} />
                  <LabeledText label="AI Agent" value={report.agent} />
                  <LabeledText label="User" value={report.user} />
                  <LabeledText
                    label="Timestamp"
                    value={moment(report.timestamp).format("LLL")}
                  />
                </InfoBlock>

                <InfoBlock title="Complaint & Summary">
                  <LabeledText
                    label="Chief Complaint"
                    value={report.chiefComplaint}
                  />
                  <LabeledText label="Summary" value={report.summary} />
                </InfoBlock>

                <InfoBlock title="Details">
                  <LabeledText
                    label="Duration"
                    value={report.duration || "Not mentioned"}
                  />
                  <LabeledText
                    label="Severity"
                    value={report.severity || "Not mentioned"}
                  />
                  <LabeledText
                    label="Symptoms"
                    value={
                      report.symptoms?.length
                        ? report.symptoms.join(", ")
                        : "None mentioned"
                    }
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
                    <p className="text-sm text-gray-500">
                      No specific recommendations
                    </p>
                  )}
                </InfoBlock>

                <InfoBlock title="Recommended Tests">
                  {report.tests && report.tests.length ? (
                    <ul className="list-disc ml-6 text-sm text-gray-700">
                      {report.tests.map((test, idx) => (
                        <li key={idx}>{test}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No tests recommended
                    </p>
                  )}
                </InfoBlock>

                <InfoBlock title="Medications Recommended">
                  {report.medicationsRecommended &&
                  report.medicationsRecommended.length ? (
                    <ul className="list-disc ml-6 text-sm text-gray-700">
                      {report.medicationsRecommended.map((med, idx) => (
                        <li key={idx}>{med}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No medications recommended
                    </p>
                  )}
                </InfoBlock>

                {/* Compare UI */}
                <InfoBlock title="Compare with Doctor Report">
                  <div className="space-y-3">
                    {/* <p className="text-xs text-gray-500">
                      Paste the doctor's report text below or upload a plain text (.txt) or PDF file. The AI will
                      compare its report and produce a similarity score and a short summary of matches/differences.
                    </p> */}

                    <div className="flex gap-2">
                      {/* <label className="block">
                        <input
                          type="file"
                          accept=".txt,application/pdf"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            handleFile(f);
                          }}
                          className="block"
                        />
                      </label> */}
                    </div>

                    <textarea
                      className="w-full border rounded-lg p-3 h-36"
                      placeholder="Or paste doctor's report here..."
                      value={doctorText}
                      onChange={(e) => setDoctorText(e.target.value)}
                    />

                    {fileName && (
                      <p className="text-xs text-gray-500">
                        Uploaded: {fileName}
                      </p>
                    )}

                    <div className="flex gap-1">
                      <Button onClick={handleCompare} disabled={loading}>
                        {loading ? "Comparing..." : "Compare"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setOpenCompare(false);
                          setDoctorText("");
                          setCompareResult(null);
                          setError(null);
                        }}
                      >
                        Close
                      </Button>
                       {/* <div className="flex justify-end"> */}
                        <Button
                          variant="ghost"
                          // size="sm"
                          onClick={() => {
                            setDoctorText("");
                            setFileName(null);
                          }}
                        >
                          Clear
                        </Button>
                      {/* </div> */}
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    {compareResult && (
                      <div className="mt-4 p-3 bg-white rounded border">
                        <p className="font-semibold">
                          Similarity Score: {compareResult.similarity}%
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          LLM summary:
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {compareResult.summary}
                        </p>

                        <div className="mt-3">
                          <h4 className="font-medium">
                            Top Doctor Report Sentences Matching AI report
                          </h4>
                          <ol className="list-decimal ml-6 mt-2 text-sm space-y-2">
                            {compareResult.matches &&
                            compareResult.matches.length ? (
                              compareResult.matches.map(
                                (m: any, idx: number) => (
                                  <li key={idx}>
                                    <div className="text-sm">{m.sentence}</div>
                                    <div className="text-xs text-gray-500">
                                      sim: {m.similarity.toFixed(2)}
                                    </div>
                                  </li>
                                )
                              )
                            ) : (
                              <li className="text-sm text-gray-500">
                                No matches found.
                              </li>
                            )}
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                </InfoBlock>

                <p className="text-center text-xs text-gray-500 mt-4 px-2">
                  This is an AI-generated report and automated comparison.
                  Results are for demonstration only and not a substitute for
                  clinical review.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
