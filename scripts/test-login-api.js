async function testLogin() {
  const email = "demo.lawyer@lexaguide.com";
  const password = "Admin12345";
  
  try {
    const res = await fetch("http://localhost:3000/api/lawyers/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data:", data);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testLogin();
