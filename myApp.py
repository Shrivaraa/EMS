import tornado.ioloop
import tornado.web
import json
import mysql.connector
import os
import jwt
import datetime
import httpx

JWT_SECRET = "secretkey1234"
JWT_ALGORITHM = "HS256"

db_config = {
    "host": "localhost",
    "user": "root",         
    "password": "vara@123", 
    "database": "myappqm"  
}

class LoginHandler(tornado.web.RequestHandler):
    def post(self):
        try:
            
            data = json.loads(self.request.body)
            username = data.get("username")
            password = data.get("password")

            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor(dictionary=True)

            
            query = "SELECT * FROM users WHERE BINARY username=%s"
            cursor.execute(query, (username,))
            user = cursor.fetchone()

            cursor.close()
            conn.close()

            if not user:
                self.set_status(401)
                self.write({"message": "User Not Found, Please SignUp"})
            elif user["password"] != password:
                self.set_status(401)
                self.write({"message": "Invalid password"})
            else:
                payload = {
                    "username": username,
                    "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=23)
                }
                token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
                if isinstance(token, bytes):
                    token = token.decode()
                self.write({
                    "message": "Login successful",
                    "token": token
                })

        except Exception as e:
            print("Login Error:", str(e))
            self.set_status(500)
            self.write({"message": "Server error"})



class SignUpHandler(tornado.web.RequestHandler):
    def post(self):
        try:
            data = json.loads(self.request.body)
            username = data.get("username")
            password = data.get("password")
            email = data.get("email", "")

            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()

            check_query = "SELECT id FROM users WHERE username = %s"
            cursor.execute(check_query, (username,))
            existing = cursor.fetchone()

            if existing:
                self.set_status(400)
                self.write({"message": "User already exists"})
            else:
                insert_query = "INSERT INTO users (username, password, email) VALUES (%s, %s, %s)"
                cursor.execute(insert_query, (username, password, email))
                conn.commit()
                self.write({"message": "Signup successful, Please Login"})

            cursor.close()
            conn.close()
        except Exception as e:
            print("Signup Error:", e)
            self.set_status(500)
            self.write({"message": "Server error"})


class DashboardSubmitHandler(tornado.web.RequestHandler):
    async def post(self):
        try:
            data = json.loads(self.request.body)

            async with httpx.AsyncClient() as client:
                response = await client.post("http://localhost:8000/api/employees", json=data)

            if response.status_code == 200:
                self.write({"message": "Employee data submitted successfully"})
            else:
                self.set_status(400)
                self.write({"message": "Failed to submit to API"})
        except Exception as e:
            print("Dashboard submit error:", e)
            self.set_status(500)
            self.write({"message": "Internal server error"})


def make_app():
    base_dir = os.path.dirname(__file__)
    frontend_path = os.path.join(base_dir, "Frontend")

    return tornado.web.Application([
        (r"/login", LoginHandler),
        (r"/signup", SignUpHandler),
        (r"/dashboard/submit", DashboardSubmitHandler),
        (r"/static/(.*)", tornado.web.StaticFileHandler, {
            "path": os.path.join(frontend_path, "static")
        }),
        (r"/pages/(.*)", tornado.web.StaticFileHandler, {
            "path": os.path.join(frontend_path, "pages")
        }),
        (r"/", tornado.web.RedirectHandler, {"url": "/pages/Login.html"}),
    ], debug=True)

if __name__ == "__main__":
    app = make_app()
    app.listen(8888)
    print("Server running at http://localhost:8888")
    tornado.ioloop.IOLoop.current().start()
