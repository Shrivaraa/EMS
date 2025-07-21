document.addEventListener("DOMContentLoaded", () => {
  const empForm = document.getElementById("employeeForm");

  // Show the next ID just for display (does not increment)
  fetch("http://localhost:8000/api/employees/peek-id")
    .then((res) => res.json())
    .then((data) => {
      empForm.employee_id.value = data.next_employee_id;
      empForm.employee_id.readOnly = true;
    })
    .catch((err) => {
      showToast("Failed to load employee ID", "error");
      console.error("Peek ID Error:", err);
    });

  if (empForm) {
    empForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        // Actually increment and fetch the true ID
        const idRes = await fetch(
          "http://localhost:8000/api/employees/next-id"
        );
        const idData = await idRes.json();
        const newEmpId = idData.next_employee_id;
        empForm.employee_id.value = newEmpId;

        const formData = {
          employee_id: newEmpId,
          name: empForm.name.value,
          designation: empForm.designation.value,
          department: empForm.department.value,
          email: empForm.email.value,
        };

        const res = await fetch("/dashboard/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("jwt_token")}`,
          },
          body: JSON.stringify(formData),
        });

        const result = await res.json();
        showToast(result.message, res.ok ? "success" : "error");
        empForm.reset();

        // Refresh the ID for the next form
        const nextPeek = await fetch(
          "http://localhost:8000/api/employees/peek-id"
        );
        const peekData = await nextPeek.json();
        empForm.employee_id.value = peekData.next_employee_id;
        empForm.employee_id.readOnly = true;
      } catch (err) {
        showToast("Failed to submit employee data", "error");
        console.error(err);
      }
    });
  }
});

let allEmployees = [];

function toggleEmployeeList() {
  fetch("http://localhost:8000/api/employees")
    .then((res) => res.json())
    .then((data) => {
      allEmployees = data;

      const searchInput = document.getElementById("employeeSearch");
      const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
      const selectAll = document.getElementById("selectAll");

      // Reset search input and buttons
      if (searchInput) searchInput.value = "";
      if (bulkDeleteBtn) bulkDeleteBtn.style.display = "none";
      if (selectAll) selectAll.checked = false;

      // Initial render with no filter
      renderFilteredEmployees("");

      // Add search input filter
      if (searchInput) {
        searchInput.oninput = () => {
          const query = searchInput.value.trim().toLowerCase();
          renderFilteredEmployees(query);
        };
      }
    })
    .catch((err) => {
      console.error("Failed to load employee list:", err);
      showToast("Error fetching employee data", "error");
    });
}
function renderFilteredEmployees(query) {
  const tbody = document.querySelector("#employeeTable tbody");
  const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
  const selectAll = document.getElementById("selectAll");

  tbody.innerHTML = "";

  const filtered = allEmployees.filter((emp) =>
    Object.values(emp).some((val) => val.toLowerCase().includes(query))
  );

  filtered.forEach((emp) => {
    const tr = document.createElement("tr");
    tr.classList.add("employee-row");

    tr.innerHTML = `
      <td><input type="checkbox" class="row-checkbox" data-id="${emp.employee_id}" /></td>
      <td>${emp.employee_id}</td>
      <td>${emp.name}</td>
      <td>${emp.designation}</td>
      <td>${emp.department}</td>
      <td>${emp.email}</td>
    `;
    tbody.appendChild(tr);
  });

  attachCheckboxListeners(); // Reattach listeners after re-render
  // -----------
  document.querySelectorAll(".employee-row").forEach((row) => {
    row.addEventListener("click", function (e) {
      if (e.target.tagName.toLowerCase() === "input") return; // Skip checkbox click

      const checkbox = this.querySelector(".row-checkbox");
      checkbox.checked = !checkbox.checked;
      toggleBulkDeleteVisibility(); // Update bulk delete button visibility
    });
  });
  // -------------
  // Reset "Select All" and delete button visibility
  if (selectAll) selectAll.checked = false;
  if (bulkDeleteBtn) bulkDeleteBtn.style.display = "none";
}
function toggleBulkDeleteVisibility() {
  const checkboxes = document.querySelectorAll(".row-checkbox");
  const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
  const anyChecked = [...checkboxes].some((c) => c.checked);
  bulkDeleteBtn.style.display = anyChecked ? "inline-block" : "none";
}
function attachCheckboxListeners() {
  const checkboxes = document.querySelectorAll(".row-checkbox");
  const selectAll = document.getElementById("selectAll");

  checkboxes.forEach((cb) =>
    cb.addEventListener("change", toggleBulkDeleteVisibility)
  );

  if (selectAll) {
    selectAll.addEventListener("change", () => {
      checkboxes.forEach((cb) => (cb.checked = selectAll.checked));
      toggleBulkDeleteVisibility();
    });
  }
}
function bulkDeleteEmployees() {
  const selected = [...document.querySelectorAll(".row-checkbox:checked")];
  if (selected.length === 0) return;

  const idsToDelete = selected.map((cb) => cb.dataset.id);

  if (
    !confirm(`Are you sure you want to delete ${idsToDelete.length} employees?`)
  )
    return;

  Promise.all(
    idsToDelete.map((id) =>
      fetch(`http://localhost:8000/api/employees/${id}`, {
        method: "DELETE",
      })
    )
  )
    .then(() => {
      showToast("Selected employees Deleted Successfully", "success");
      toggleEmployeeList();
      document.getElementById("bulkDeleteBtn").style.display = "none";
      document.getElementById("selectAll").checked = false;
    })
    .catch((err) => {
      showToast("Failed to delete some employees", "error");
      console.error(err);
    });
}

function toggleViewById() {
  document.getElementById("employeeFormWrapper").style.display = "none";
  document.getElementById("employeeSection").style.display = "none";
  document.getElementById("viewByIdSection").style.display = "block";
  document.getElementById("employeeDetails").style.display = "none";
}

function toggleForm() {
  document.getElementById("employeeFormWrapper").style.display = "block";
  document.getElementById("employeeSection").style.display = "none";
  document.getElementById("viewByIdSection").style.display = "none";
  document.getElementById("employeeDetails").style.display = "none";
}

function renderEmployeeTable(employees) {
  const tbody = document.querySelector("#employeeTable tbody");
  tbody.innerHTML = "";

  if (!employees.length) {
    tbody.innerHTML = "<tr><td colspan='5'>No employee records found</td></tr>";
    return;
  }

  employees.forEach((emp) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${emp.employee_id}</td>
      <td>${emp.name}</td>
      <td>${emp.designation}</td>
      <td>${emp.department}</td>
      <td>${emp.email}</td>
    `;
    tbody.appendChild(row);
  });
}

async function fetchEmployees() {
  try {
    const res = await fetch("http://localhost:8000/api/employees");
    const data = await res.json();
    renderEmployeeTable(data);
  } catch (err) {
    showToast("Failed to load employee list", "error");
  }
}

async function viewEmployeeById() {
  const id = document.getElementById("searchById").value.trim();
  if (!id) return showToast("Enter a valid ID", "error");

  try {
    const res = await fetch(`http://localhost:8000/api/employees/${id}`);
    if (!res.ok) throw new Error();

    const emp = await res.json();
    document.getElementById("viewByIdSection").style.display = "none";
    document.getElementById("employeeDetails").style.display = "block";

    document.getElementById("emp_id").value = emp.employee_id;
    document.getElementById("emp_name").value = emp.name;
    document.getElementById("emp_designation").value = emp.designation;
    document.getElementById("emp_department").value = emp.department;
    document.getElementById("emp_email").value = emp.email;
  } catch (err) {
    showToast("Employee not found", "error");
    document.getElementById("employeeDetails").style.display = "none";
  }
}

// async function updateEmployee() {
//   const id = document.getElementById("emp_id").value;
//   const updatedData = {
//     employee_id: id,
//     name: document.getElementById("emp_name").value,
//     designation: document.getElementById("emp_designation").value,
//     department: document.getElementById("emp_department").value,
//     email: document.getElementById("emp_email").value,
//   };

//   try {
//     const res = await fetch(`http://localhost:8000/api/employees/${id}`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(updatedData),
//     });

//     const result = await res.json();
//     showToast(result.message, "success");
//     toggleForm();
//   } catch (err) {
//     showToast("Failed to update employee", "error");
//   }
// }

// async function deleteEmployee() {
//   const id = document.getElementById("emp_id").value;

//   if (!confirm(`Are you sure you want to delete employee ${id}?`)) return;

//   try {
//     const res = await fetch(`http://localhost:8000/api/employees/${id}`, {
//       method: "DELETE",
//     });

//     const result = await res.json();
//     showToast(result.message, "success");
//     document.getElementById("searchById").value = "";
//     document.getElementById("emp_id").value = "";
//     document.getElementById("emp_name").value = "";
//     document.getElementById("emp_designation").value = "";
//     document.getElementById("emp_department").value = "";
//     document.getElementById("emp_email").value = "";

//     document.getElementById("employeeDetails").style.display = "none";
//     fetchEmployees();
//     toggleForm();
//   } catch (err) {
//     showToast("Failed to delete employee", "error");
//   }
// }
function loadKPIAnalytics() {
  fetch("http://localhost:8000/api/employees/analytics")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch KPI data");
      }
      return response.json();
    })
    .then((data) => {
      document.getElementById("kpi-total").innerText =
        data.total_employees ?? "--";
      document.getElementById("kpi-departments").innerText =
        data.department_count ?? "--";
      document.getElementById("kpi-designation").innerText =
        data.top_designation ?? "--";
      document.getElementById("kpi-top-department").innerText =
        data.top_department ?? "--";
    })
    .catch((error) => {
      console.error("Error loading KPIs:", error);
    });
}
function showSection(section) {
  const dashboard = document.getElementById("dashboardSection");
  const analytics = document.getElementById("analyticsSection");
  const employeelist = document.getElementById("employeeSection");
  const manage = document.getElementById("manageSection");

  dashboard.style.display = section === "dashboard" ? "block" : "none";
  analytics.style.display = section === "analytics" ? "block" : "none";
  employeelist.style.display = section === "employeelist" ? "block" : "none";
  manage.style.display = section === "manage" ? "block" : "none";

  if (section === "analytics") loadKPIAnalytics();
  if (section === "employeelist") toggleEmployeeList();
}
// ================================================================================================
// ================================================================================================
async function manageEmployeeById() {
  const id = document.getElementById("manageEmpId").value.trim();
  const formWrapper = document.getElementById("manageFormWrapper");

  if (!id) return showToast("Enter Employee ID", "error");

  try {
    const res = await fetch(`http://localhost:8000/api/employees/${id}`);
    if (!res.ok) throw new Error();
    const emp = await res.json();
    formWrapper.style.display = "block";

    document.getElementById("manage_emp_id").value = emp.employee_id;
    document.getElementById("manage_emp_name").value = emp.name;
    document.getElementById("manage_emp_designation").value = emp.designation;
    document.getElementById("manage_emp_department").value = emp.department;
    document.getElementById("manage_emp_email").value = emp.email;
  } catch (err) {
    showToast("Employee not found", "error");
    formWrapper.style.display = "none";
  }
}
async function UpdateEmployee() {
  const id = document.getElementById("manage_emp_id").value;

  const updatedData = {
    employee_id: id,
    name: document.getElementById("manage_emp_name").value,
    designation: document.getElementById("manage_emp_designation").value,
    department: document.getElementById("manage_emp_department").value,
    email: document.getElementById("manage_emp_email").value,
  };

  try {
    const res = await fetch(`http://localhost:8000/api/employees/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedData),
    });

    const result = await res.json();
    showToast(result.message, res.ok ? "success" : "error");

    // Reset fields for next entry
    document.getElementById("manage_updateForm").reset();
    document.getElementById("manageEmpId").value = "";
    document.getElementById("manageFormWrapper").style.display = "none";
  } catch (err) {
    showToast("Failed to update employee", "error");
    console.error(err);
  }
}
async function DeleteEmployee() {
  const id = document.getElementById("manage_emp_id").value;

  if (!confirm(`Are you sure you want to delete employee ${id}?`)) return;

  try {
    const res = await fetch(`http://localhost:8000/api/employees/${id}`, {
      method: "DELETE",
    });

    const result = await res.json();
    showToast(result.message, res.ok ? "success" : "error");

    // Clear the form for next entry
    document.getElementById("manage_updateForm").reset();
  } catch (err) {
    showToast("Failed to delete employee", "error");
    console.error(err);
  }
}
function exportToCSV() {
  fetch("http://localhost:8000/api/employees")
    .then((res) => res.json())
    .then((data) => {
      if (!data.length) {
        showToast("No data to export", "info");
        return;
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(","),
        ...data.map((emp) =>
          headers
            .map((h) => `"${(emp[h] ?? "").toString().replace(/"/g, '""')}"`)
            .join(",")
        ),
      ];

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "employee_list.csv";
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch((err) => {
      console.error("CSV Export Error:", err);
      showToast("Failed to export data", "error");
    });
}
