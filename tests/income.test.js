const { getIncome } = require("../Controllers/incomeController");

describe("Income tracking", () => {
  test("calculates income for the logged-in freelancer", (done) => {
    const req = {
      user: {
        userId: "freelancer-001",
        role: "freelancer"
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((data) => {
        expect(data.totalIncome).toBe(1250);
        expect(data.bookings).toHaveLength(2);
        done();
      })
    };

    getIncome(req, res);
  });

  test("only returns bookings belonging to the logged-in freelancer", (done) => {
    const req = {
      user: {
        userId: "freelancer-002",
        role: "freelancer"
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((data) => {
        expect(data.totalIncome).toBe(1000);
        expect(data.bookings).toHaveLength(1);
        expect(data.bookings[0].freelancerId).toBe("freelancer-002");
        done();
      })
    };

    getIncome(req, res);
  });
});
