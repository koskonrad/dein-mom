async function lookupLocation(ip) {
    const res  = await fetch(`https://ipwho.is/${ip}`);
    const json = await res.json();
    if (!json.success) throw new Error("Geolookup fehlgeschlagen");
    return { country: json.country, region: json.region, city: json.city };
  }
  module.exports = { lookupLocation };