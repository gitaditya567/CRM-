const login = async () => {
    try {
        console.log("Attempting login to LIVE server...");
        const response = await fetch('https://crm-backend-w4w1.onrender.com/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@shop.com',
                password: 'team12345'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Login SUCCESS!");
            console.log("Token:", data.token ? "Received" : "Missing");
            console.log("User:", data);
        } else {
            console.error("Login FAILED");
            console.error("Status:", response.status);
            console.error("Data:", data);
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
};

login();
