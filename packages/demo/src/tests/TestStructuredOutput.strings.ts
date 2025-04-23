export const MOCK_HTML = `
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Example Bank</div>
            <div class="date">April 23, 2025</div>
        </div>
        
        <div class="account-summary">
            <h2>Account Summary</h2>
            <div class="account-info">
                <div>Account Name:</div>
                <div>John Smith</div>
            </div>
            <div class="account-info">
                <div>Account Type:</div>
                <div>Checking Account</div>
            </div>
            <div class="account-number">
                <div><strong>Account Number:</strong></div>
                <div class="masked">****5678</div>
            </div>
            
            <div>Current Balance:</div>
            <div class="balance positive">$2,453.67</div>
            
            <div>Available Balance:</div>
            <div class="balance positive">$2,453.67</div>
        </div>
        
        <div class="recent-activity">
            <h2>Recent Transactions</h2>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Balance</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Apr 22, 2025</td>
                        <td>GROCERY STORE</td>
                        <td>-$78.45</td>
                        <td>$2,453.67</td>
                    </tr>
                    <tr>
                        <td>Apr 20, 2025</td>
                        <td>SALARY DEPOSIT</td>
                        <td>+$1,200.00</td>
                        <td>$2,532.12</td>
                    </tr>
                    <tr>
                        <td>Apr 18, 2025</td>
                        <td>ONLINE PAYMENT</td>
                        <td>-$45.99</td>
                        <td>$1,332.12</td>
                    </tr>
                    <tr>
                        <td>Apr 15, 2025</td>
                        <td>ATM WITHDRAWAL</td>
                        <td>-$200.00</td>
                        <td>$1,378.11</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</body>
`.trim();