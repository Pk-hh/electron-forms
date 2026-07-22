class Student:
    def __init__(self, roll, name, addr, crs):
        self.roll, self.name, self.addr, self.crs = roll, name, addr, crs
    def print_details(self):
        print(f'Student: {self.roll}, {self.name}, {self.addr}, {self.crs}')

class Book:
    def __init__(self, bid, name, cost, pub):
        self.bid, self.name, self.cost, self.pub = bid, name, cost, pub
    def display(self):
        print(f'Book: {self.bid}, {self.name}, Rs.{self.cost}, {self.pub}')

class Account:
    def __init__(self, acc_no, name, bal):
        self.acc_no, self.name, self.bal = acc_no, name, bal
    def deposit(self, amt):
        self.bal += amt
    def withdraw(self, amt):
        if self.bal >= amt: self.bal -= amt
    def display(self):
        print(f'Account: {self.acc_no}, {self.name}, Balance: {self.bal}')

class Product:
    def __init__(self, pid, name, price, exp):
        self.pid, self.name, self.price, self.exp = pid, name, price, exp
    def display(self):
        print(f'Product: {self.pid}, {self.name}, Rs.{self.price}, Exp: {self.exp}')

class ComplexNumber:
    def __init__(self, real, img):
        self.real, self.img = real, img
    def add(self, other):
        return ComplexNumber(self.real + other.real, self.img + other.img)
    def display(self):
        print(f'Complex: {self.real} + {self.img}i')

class Employee:
    count = 0
    def __init__(self, eno, ename, sal, desig):
        self.eno, self.ename, self.sal, self.desig = eno, ename, sal, desig
        Employee.count += 1
    def display(self):
        print(f'Employee: {self.eno}, {self.ename} | Total Created: {Employee.count}')

Student(101, 'Ravi', 'Vizag', 'ECE').print_details()
for i in range(1, 4): Book(i, f'Book_{i}', 100+i*50, 'JNTU').display()
acc = Account(555, 'Alice', 1000)
acc.deposit(500); acc.withdraw(200); acc.display()
Product('P1', 'Laptop', 55000, '2028-12').display()
c1 = ComplexNumber(2, 3); c2 = ComplexNumber(4, 5)
c1.add(c2).display()
e1 = Employee(1, 'John', 60000, 'Dev'); e1.display()
e2 = Employee(2, 'Jane', 70000, 'Mgr'); e2.display()
