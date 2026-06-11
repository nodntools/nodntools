export default async function handler(req, res) {
  try {
    const token = process.env.TRAVELPAYOUTS_TOKEN;
    const marker = process.env.TRAVELPAYOUTS_MARKER || "";

    if (!token) {
      return res.status(500).json({
        success: false,
        error: "Travelpayouts API token is missing."
      });
    }

    const {
      origin,
      destination,
      departDate,
      returnDate,
      tripType = "round",
      currency = "USD"
    } = req.query;

    if (!origin || !departDate) {
      return res.status(400).json({
        success: false,
        error: "Origin and departure date are required."
      });
    }

    const apiUrl = new URL("https://api.travelpayouts.com/aviasales/v3/prices_for_dates");
    apiUrl.searchParams.set("origin", origin.toUpperCase());
    apiUrl.searchParams.set("departure_at", departDate);
    apiUrl.searchParams.set("currency", currency);
    apiUrl.searchParams.set("limit", "40");
    apiUrl.searchParams.set("sorting", "price");
    apiUrl.searchParams.set("one_way", tripType === "oneway" ? "true" : "false");

    if (destination && destination !== "ANYWHERE") {
      apiUrl.searchParams.set("destination", destination.toUpperCase());
    }

    if (tripType === "round" && returnDate) {
      apiUrl.searchParams.set("return_at", returnDate);
    }

    const response = await fetch(apiUrl.toString(), {
      headers: {
        "X-Access-Token": token
      }
    });

    const raw = await response.json();

    if (!response.ok || raw.success === false) {
      return res.status(502).json({
        success: false,
        error: raw.error || "Travelpayouts API request failed."
      });
    }

    const rows = Array.isArray(raw.data) ? raw.data : [];

    const data = rows.map((item) => {
      let dealUrl = item.link || "";

      if (dealUrl && !dealUrl.startsWith("http")) {
        dealUrl = `https://www.aviasales.com${dealUrl}`;
      }

      if (dealUrl && marker) {
        dealUrl += dealUrl.includes("?")
          ? `&marker=${encodeURIComponent(marker)}`
          : `?marker=${encodeURIComponent(marker)}`;
      }

      return {
        origin: item.origin || origin.toUpperCase(),
        destination: item.destination || "",
        price: item.price || null,
        currency,
        airline: item.airline || "",
        flightNumber: item.flight_number || "",
        departureAt: item.departure_at || "",
        returnAt: item.return_at || "",
        transfers: typeof item.transfers === "number" ? item.transfers : null,
        expiresAt: item.expires_at || "",
        link: dealUrl || "https://www.aviasales.com"
      };
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server error while fetching flight prices."
    });
  }
}