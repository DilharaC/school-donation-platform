import React, { useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

interface User {
  userType: "donor" | "school";
  donorName?: string;
  email?: string;
}

interface DonationFormProps {
  currentUser: User | null;
}

const DonationForm: React.FC<DonationFormProps> = ({ currentUser }) => {
  const { requestId } = useParams<{ requestId: string }>();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!requestId) return <p>Invalid project ID.</p>;

  const submitDonation = async () => {
    setError("");

    // Only donors can donate
    if (!currentUser || currentUser.userType !== "donor") {
      setError("Please login as a donor to donate.");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    const payload = {
      request_id: parseInt(requestId, 10),
      amount: parseFloat(amount),
      message,
      recurring: "none",
      anonymous: 0,
      donor_name: currentUser.donorName,
      donor_email: currentUser.email || null,
    };

    setLoading(true);

    try {
      // CSRF cookie
      await axios.get("http://localhost:8000/sanctum/csrf-cookie", { withCredentials: true });

      // Donation POST request
      const res = await axios.post("http://localhost:8000/api/donations/create", payload, {
        withCredentials: true,
      });

      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        alert("Donation created, but no checkout URL returned.");
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Unauthenticated. Please login again.");
      } else {
        setError(err.response?.data?.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto", padding: 20, background: "#fff", borderRadius: 12 }}>
      <h2>Donate to Project</h2>
      {currentUser && currentUser.donorName && <p>Logged in as: {currentUser.donorName}</p>}
      {!currentUser && <p>Please login to donate.</p>}

      {error && <div style={{ color: "#e63946", marginBottom: 15 }}>{error}</div>}

      <input
        type="number"
        placeholder="Amount (USD)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ width: "100%", padding: 12, marginBottom: 15 }}
      />

      <textarea
        placeholder="Message (Optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ width: "100%", padding: 12, marginBottom: 15, minHeight: 80 }}
      />

      <button onClick={submitDonation} disabled={loading} style={{ width: "100%", padding: 12 }}>
        {loading ? "Processing..." : "Donate"}
      </button>
    </div>
  );
};

export default DonationForm;
