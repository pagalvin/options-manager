function getMonday(date: Date): Date {
  const monday = new Date(date);
  monday.setDate(date.getDate() - date.getDay() + 1);
  return monday;
}

function getSunday(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

function getNextSunday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilNextSunday = (7 - dayOfWeek) % 7 || 7;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilNextSunday);
  return nextSunday;
}

    // Helper function to get month names
    const getLastThreeMonthsNames = () => {
        const now = new Date();
        const currentMonth = now.toLocaleString("default", { month: "long" });
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString("default", {
            month: "long",
        });
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1).toLocaleString("default", {
            month: "long",
        });

        return {
            currentMonth,
            lastMonth,
            twoMonthsAgo,
        };
    };

export { getMonday, getSunday, getNextSunday, getLastThreeMonthsNames };
