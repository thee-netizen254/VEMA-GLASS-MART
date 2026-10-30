
// ========================================
// GLASS MART MANAGEMENT SYSTEM
// Main JavaScript File
// ========================================


// 1. SAVE AND LOAD DATA

function loadData(key, defaultValue) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch (error) {
        console.error("Could not load data:", error);
        return defaultValue;
    }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}


// 2. SYSTEM DATA

let products = loadData("glassProducts", [
    { id: 1, name: "Clear Glass 4mm", price: 1500, quantity: 20 },
    { id: 2, name: "Clear Glass 6mm", price: 3000, quantity: 15 },
    { id: 3, name: "Tinted Glass", price: 4000, quantity: 10 }
]);

let sales = loadData("glassSales", []);
let orders = loadData("glassOrders", []);
let smsHistory = loadData("glassSMS", []);

let settings = loadData("glassSettings", {
    manager: "",
    owner: ""
});


// 3. HELPER FUNCTIONS

function money(amount) {
    return "KES " + Number(amount).toLocaleString("en-KE");
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[character];
    });
}

function saveAll() {
    saveData("glassProducts", products);
    saveData("glassSales", sales);
    saveData("glassOrders", orders);
    saveData("glassSMS", smsHistory);
    saveData("glassSettings", settings);
}


// 4. PAGE NAVIGATION

document.querySelectorAll(".nav-btn").forEach(button => {

    button.addEventListener("click", function () {

        const selectedPage = this.dataset.page;

        document.querySelectorAll(".page").forEach(page => {
            page.classList.remove("active");
        });

        document.getElementById(selectedPage).classList.add("active");

        document.querySelectorAll(".nav-btn").forEach(nav => {
            nav.classList.remove("active");
        });

        this.classList.add("active");

    });

});


// 5. DISPLAY PRODUCTS IN DROPDOWN

function updateProductDropdowns() {

    const saleSelect = document.getElementById("saleProduct");
    const orderSelect = document.getElementById("orderProduct");

    saleSelect.innerHTML = '<option value="">Select Product</option>';
    orderSelect.innerHTML = '<option value="">Select Product</option>';

    products.forEach(product => {

        const option = document.createElement("option");

        option.value = product.id;
        option.textContent =
            product.name + " - " + money(product.price) +
            " (Stock: " + product.quantity + ")";

        if (product.quantity > 0) {
            saleSelect.appendChild(option.cloneNode(true));
        }

        orderSelect.appendChild(option);

    });

}


// 6. ADD NEW PRODUCT

document.getElementById("productForm")
.addEventListener("submit", function(event) {

    event.preventDefault();

    const name = document.getElementById("productName").value.trim();
    const price = Number(document.getElementById("productPrice").value);
    const quantity = Number(document.getElementById("productQuantity").value);

    if (!name || !Number.isFinite(price) || price <= 0 ||
        !Number.isInteger(quantity) || quantity < 0) {

        alert("Please enter valid product details.");
        return;
    }

    const newProduct = {
        id: Date.now(),
        name: name,
        price: price,
        quantity: quantity
    };

    products.push(newProduct);

    saveAll();

    this.reset();

    renderSystem();

    alert("Product added successfully!");

});


// 7. RECORD SALES

document.getElementById("salesForm")
.addEventListener("submit", function(event) {

    event.preventDefault();

    const productId = Number(document.getElementById("saleProduct").value);
    const quantity = Number(document.getElementById("saleQuantity").value);

    const payment = document.getElementById("paymentMethod").value;

    const product = products.find(item => item.id === productId);

    if (!product) {
        alert("Please select a valid product.");
        return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        alert("Enter a valid quantity.");
        return;
    }

    if (product.quantity < quantity) {
        alert("Insufficient stock available!");
        return;
    }

    // Calculate total amount

    const total = product.price * quantity;

    // Generate transaction ID

    const transactionId = "GM" + Date.now();

    // Save the sale

    const sale = {

        id: transactionId,
        product: product.name,
        quantity: quantity,
        price: product.price,
        total: total,
        payment: payment,
        date: new Date().toLocaleString()

    };

    sales.push(sale);

    // Reduce available stock

    product.quantity -= quantity;

    // Generate SMS notifications

    generateSMS(sale);

    // Save all changes

    saveAll();

    this.reset();

    renderSystem();

    alert(
        "Sale completed successfully!\n" +
        "Transaction: " + transactionId +
        "\nTotal: " + money(total) +
        "\nSMS notification records generated."
    );

});


// 8. SMS NOTIFICATION FUNCTION

function generateSMS(sale) {

    const recipients = [
        {
            role: "Manager",
            phone: settings.manager
        },
        {
            role: "Owner",
            phone: settings.owner
        }
    ];

    const message =
        "GLASS MART SALES ALERT. " +
        "Transaction: " + sale.id +
        ". Product: " + sale.product +
        ". Quantity: " + sale.quantity +
        ". Total: " + money(sale.total) +
        ". Payment: " + sale.payment +
        ". Date: " + sale.date;

    recipients.forEach(recipient => {

        if (!recipient.phone) {
            return;
        }

        smsHistory.push({

            transaction: sale.id,
            recipient: recipient.role,
            phone: recipient.phone,
            message: message,

            // DEMONSTRATION ONLY.
            // This does NOT mean an SMS was delivered.

            status: "DEMO - NOT SENT",
            date: new Date().toLocaleString()

        });

    });

}


// 9. ADD REMOTE CUSTOMER ORDER

document.getElementById("orderForm")
.addEventListener("submit", function(event) {

    event.preventDefault();

    const customer = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();

    const productId = Number(document.getElementById("orderProduct").value);

    const quantity = Number(document.getElementById("orderQuantity").value);

    const product = products.find(item => item.id === productId);

    if (!customer || !phone || !product ||
        !Number.isInteger(quantity) || quantity <= 0) {

        alert("Please enter valid order details.");
        return;
    }

    const order = {

        id: "ORD" + Date.now(),
        customer: customer,
        phone: phone,
        product: product.name,
        quantity: quantity,
        status: "Pending",
        date: new Date().toLocaleString()

    };

    orders.push(order);

    saveAll();

    this.reset();

    renderSystem();

    alert("Remote order recorded successfully!");

});


// 10. UPDATE REMOTE ORDER STATUS

document.getElementById("orderRecords")
.addEventListener("click", function(event) {

    const button = event.target.closest("[data-order-id]");

    if (!button) return;

    const orderId = button.dataset.orderId;

    const order = orders.find(item => item.id === orderId);

    if (!order) return;

    if (order.status === "Pending") {

        order.status = "Processing";

    } else if (order.status === "Processing") {

        order.status = "Completed";

    } else {

        return;

    }

    saveAll();

    renderSystem();

});


// 11. SAVE MANAGER AND OWNER PHONE NUMBERS

document.getElementById("settingsForm")
.addEventListener("submit", function(event) {

    event.preventDefault();

    const manager = document.getElementById("managerPhone").value.trim();
    const owner = document.getElementById("ownerPhone").value.trim();

    const phonePattern = /^254[17]\d{8}$/;

    if (!phonePattern.test(manager) || !phonePattern.test(owner)) {

        alert("Enter valid Kenyan mobile numbers in 254XXXXXXXXX format.");
        return;
    }

    settings.manager = manager;
    settings.owner = owner;

    saveAll();

    renderSystem();

    alert("SMS recipient settings saved successfully!");

});


// 12. DISPLAY STOCK RECORDS

function displayStock() {

    const table = document.getElementById("stockRecords");

    table.innerHTML = "";

    products.forEach(product => {

        const status = product.quantity === 0
            ? "Out of Stock"
            : product.quantity <= 5
            ? "Low Stock"
            : "Available";

        table.innerHTML += `

            <tr>

                <td>${escapeHTML(product.name)}</td>

                <td>${money(product.price)}</td>

                <td>${product.quantity}</td>

                <td>${status}</td>

            </tr>

        `;

    });

}


// 13. DISPLAY SALES RECORDS

function displaySales() {

    const table = document.getElementById("salesRecords");
    const recent = document.getElementById("recentSales");

    table.innerHTML = "";
    recent.innerHTML = "";

    [...sales].reverse().forEach(sale => {

        table.innerHTML += `

            <tr>
                <td>${escapeHTML(sale.id)}</td>
                <td>${escapeHTML(sale.product)}</td>
                <td>${sale.quantity}</td>
                <td>${money(sale.total)}</td>
                <td>${escapeHTML(sale.payment)}</td>
            </tr>

        `;

        recent.innerHTML += `

            <tr>
                <td>${escapeHTML(sale.id)}</td>
                <td>${escapeHTML(sale.product)}</td>
                <td>${money(sale.total)}</td>
                <td>${escapeHTML(sale.date)}</td>
            </tr>

        `;

    });

}


// 14. DISPLAY REMOTE ORDERS

function displayOrders() {

    const table = document.getElementById("orderRecords");

    table.innerHTML = "";

    orders.forEach(order => {

        const nextAction = {
            "Pending": "Start Processing",
            "Processing": "Complete Order",
            "Completed": "Completed"
        }[order.status];

        const disabled = order.status === "Completed"
            ? "disabled"
            : "";

        table.innerHTML += `

            <tr>

                <td>${escapeHTML(order.id)}</td>

                <td>${escapeHTML(order.customer)}</td>

                <td>${escapeHTML(order.product)}</td>

                <td>${order.quantity}</td>

                <td>${escapeHTML(order.status)}</td>

                <td>
                    <button
                        class="action-btn"
                        data-order-id="${escapeHTML(order.id)}"
                        ${disabled}>
                        ${nextAction}
                    </button>
                </td>

            </tr>

        `;

    });

}


// 15. DISPLAY SMS NOTIFICATION RECORDS

function displaySMS() {

    const table = document.getElementById("smsRecords");

    table.innerHTML = "";

    [...smsHistory].reverse().forEach(sms => {

        table.innerHTML += `

            <tr>

                <td>${escapeHTML(sms.transaction)}</td>

                <td>
                    ${escapeHTML(sms.recipient)}
                    (${escapeHTML(sms.phone)})
                </td>

                <td>${escapeHTML(sms.message)}</td>

                <td>${escapeHTML(sms.status)}</td>

            </tr>

        `;

    });

}


// 16. UPDATE DASHBOARD

function updateDashboard() {

    const total = sales.reduce(
        (sum, sale) => sum + sale.total, 0
    );

    const stock = products.reduce(
        (sum, product) => sum + product.quantity, 0
    );

    document.getElementById("totalSales").textContent =
        money(total);

    document.getElementById("totalProducts").textContent =
        products.length;

    document.getElementById("availableStock").textContent =
        stock;

    document.getElementById("totalOrders").textContent =
        orders.length;

}


// 17. DISPLAY SMS RECIPIENTS

function displaySettings() {

    document.getElementById("showManager").textContent =
        settings.manager || "Not configured";

    document.getElementById("showOwner").textContent =
        settings.owner || "Not configured";

    document.getElementById("managerPhone").value =
        settings.manager;

    document.getElementById("ownerPhone").value =
        settings.owner;

}


// 18. REFRESH THE WHOLE SYSTEM

function renderSystem() {

    updateProductDropdowns();

    displayStock();

    displaySales();

    displayOrders();

    displaySMS();

    updateDashboard();

    displaySettings();

}


// 19. START THE SYSTEM

renderSystem();

console.log("Glass Mart Management System is running.");
