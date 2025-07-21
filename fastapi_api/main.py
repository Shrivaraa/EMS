from fastapi import FastAPI
from pydantic import BaseModel
from pymongo import MongoClient
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException
from collections import Counter
from pymongo import ReturnDocument

app = FastAPI()

client = MongoClient("mongodb://localhost:27017")
db = client["company"]
collection = db["employees"]

class Employee(BaseModel):
    employee_id: str
    name: str
    designation: str
    department: str
    email: str

@app.post("/api/employees")
def create_or_update_employee(emp: Employee):
    collection.update_one(
        {"employee_id": emp.employee_id},
        {"$set": emp.model_dump()},
        upsert=True
    )
    return {"message": "Employee data stored successfully"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/api/employees")
def get_all_employees():
    employees = list(collection.find({}, {"_id": 0}))
    return employees

@app.get("/api/employees/analytics")
def get_employee_kpis():
    employees = list(collection.find({}, {"_id": 0}))
    if not employees:
        return {
            "total_employees": 0,
            "department_count": 0,
            "top_department": "N/A",
            "top_designation": "N/A",
        }
    departments = [emp["department"] for emp in employees if "department" in emp]
    designations = [emp["designation"] for emp in employees if "designation" in emp]


    return {
        "total_employees": len(employees),
        "department_count": len(set(departments)),
        "top_department": Counter(departments).most_common(1)[0][0] if departments else "N/A",
        "top_designation": Counter(designations).most_common(1)[0][0] if designations else "N/A"
    }

@app.get("/api/employees/next-id")
def get_next_employee_id():
    counter = db["counters"].find_one_and_update(
        {"_id": "employee_id"},                 
        {"$inc": {"seq": 1}},                 
        upsert=True,                            
        return_document=ReturnDocument.AFTER   
    )

    next_num = counter["seq"]
    next_id = f"EMPQM{next_num:03d}"

    return {"next_employee_id": next_id}

@app.get("/api/employees/peek-id")
def peek_next_employee_id():
    counter = db["counters"].find_one({ "_id": "employee_id" })
    next_num = (counter["seq"] + 1) if counter else 1
    next_id = f"EMPQM{next_num:03d}"
    return { "next_employee_id": next_id }

@app.get("/api/employees/{employee_id}")
def get_employee(employee_id: str):
    employee = collection.find_one({"employee_id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@app.put("/api/employees/{employee_id}")
def update_employee(employee_id: str, emp: Employee):
    result = collection.update_one(
        {"employee_id": employee_id},
        {"$set": emp.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee updated successfully"}

@app.delete("/api/employees/{employee_id}")
def delete_employee(employee_id: str):
    result = collection.delete_one({"employee_id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted successfully"}
