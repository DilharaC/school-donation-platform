import { useEffect, useState } from "react";
import axios from "axios";

const DonationSuccess: React.FC = () => {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      setStatus("No session ID found.");
      return;
    }

    axios
      .get(`http://localhost:8000/api/donations/verify?session_id=${sessionId}`, { withCredentials: true })
      .then((res) => {
        console.log("Verify response:", res.data);
        setStatus(res.data.status || "error");
      })
      .catch((err) => {
        console.error("Error verifying donation:", err.response?.data);
        setStatus(err.response?.data?.status || "error");
      });
  }, []);

  return (
    <div style={{ textAlign: "center", margin: "2rem" }}>
      <h1>Donation Status: {status}</h1>
    </div>
  );
};

export default DonationSuccess;
