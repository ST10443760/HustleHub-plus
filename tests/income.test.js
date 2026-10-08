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
        done();
      })
    };

    getIncome(req, res);
  });
});
