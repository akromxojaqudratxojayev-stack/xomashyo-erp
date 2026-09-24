import React, { useState, useEffect } from 'react';
import { 
  Fuel, 
  MapPin, 
  Navigation, 
  CheckCircle, 
  Clock, 
  Phone, 
  Scale, 
  AlertCircle, 
  Play, 
  Square, 
  RotateCcw,
  Sparkles,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { divIcon } from 'leaflet';

const createNumberedIcon = (number) => {
  return divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #059669; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; justify-content: center; align-items: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${number}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const currentPosIcon = divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #3b82f6; border-radius: 50%; width: 16px; height: 16px; border: 3px solid white; box-shadow: 0 0 0 2px #3b82f6, 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

export default function DastafkaView({ currentUser }) {
  const [deliveries, setDeliveries] = useState([]);
  const [trip, setTrip] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // GPS holati
  const [gpsActive, setGpsActive] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [watchId, setWatchId] = useState(null);

  // Modal oynalar holati
  const [completeModalItem, setCompleteModalItem] = useState(null);
  const [kartonKg, setKartonKg] = useState('');
  const [salafanKg, setSalafanKg] = useState('');
  const [paymentType, setPaymentType] = useState('NAQD');
  const [notes, setNotes] = useState('');

  // Tayyormas (qoldirish) modal holati
  const [postponeModalItem, setPostponeModalItem] = useState(null);
  const [postponeReason, setPostponeReason] = useState('Do\'kon yopiq / Mahsulot to\'planmagan');

  // Qo'lda km kiritish modal holati
  const [showManualKmModal, setShowManualKmModal] = useState(false);
  const [manualKm, setManualKm] = useState('');

  // Ma'lumotlarni yuklash
  const loadData = async () => {
    try {
      setLoading(true);
      
      const resD = await fetch('/api/deliveries');
      const dData = await resD.json();
      setDeliveries(Array.isArray(dData) ? dData : []);

      const resT = await fetch('/api/trip/today');
      const tData = await resT.json();
      setTrip(tData);

      const resS = await fetch('/api/settings');
      const sData = await resS.json();
      setSettings(sData);

      return Array.isArray(dData) ? dData : [];
    } catch (err) {
      console.error('Xatolik:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // GPS kuzatuvini boshqarish
  const toggleGps = () => {
    if (gpsActive) {
      // O'chirish
      if (watchId) navigator.geolocation.clearWatch(watchId);
      setGpsActive(false);
      setWatchId(null);
    } else {
      // Yoqish
      if (!navigator.geolocation) {
        alert('Qurilmangizda GPS geolokatsiya qo\'llab-quvvatlanmaydi');
        return;
      }

      setGpsActive(true);
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCurrentCoords({ lat, lng });

          // Serverga jo'natish
          try {
            const res = await fetch('/api/trip/update-location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lat, lng })
            });
            const data = await res.json();
            if (data.success) {
              setTrip(prev => ({
                ...prev,
                total_km: data.total_km,
                gas_spent_sum: data.gas_spent_sum
              }));
            }
          } catch (e) {
            console.error('GPS sinxronlashda xatolik:', e);
          }
        },
        (error) => {
          console.warn('GPS xatosi:', error.message);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
      setWatchId(id);
    }
  };

  const [isSorting, setIsSorting] = useState(false);

  // Eng yaqin do'kondan boshlash (Aqlli saralash)
  const sortNearestFirst = async () => {
    if (!currentCoords) {
      if (navigator.geolocation) {
        setIsSorting(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCurrentCoords(coords);
            applySorting(coords);
            setIsSorting(false);
          },
          (err) => {
            alert('Iltimos, telefoningizda GPS (Lokatsiya) ni yoqing va brauzerga ruxsat bering!');
            setIsSorting(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        alert("Siz oddiy Wi-Fi (HTTP) orqali kirdingiz, shuning uchun brauzer GPS olishga ruxsat bermaydi. Test qilish uchun taxminiy manzil olindi!");
        const fakeCoords = { lat: 41.2995, lng: 69.2401 }; // Tashkent center
        setCurrentCoords(fakeCoords);
        applySorting(fakeCoords);
      }
      return;
    }
    setIsSorting(true);
    await applySorting(currentCoords);
    setIsSorting(false);
  };

  const applySorting = async (coords, dataToUse = null) => {
    const list = dataToUse || deliveries;
    const uncompleted = list.filter(d => d.status === 'KUTILMOQDA');
    const completed = list.filter(d => d.status !== 'KUTILMOQDA');

    const getDist = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    // Nearest Neighbor (Zanjirli Marshrut Algoritmi)
    let sortedUncompleted = [];
    let currentPoint = coords;
    let remain = [...uncompleted];

    while (remain.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < remain.length; i++) {
        const dist = getDist(currentPoint.lat, currentPoint.lng, remain[i].store_lat, remain[i].store_lng);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }
      const nearestStore = remain[nearestIdx];
      sortedUncompleted.push(nearestStore);
      currentPoint = { lat: nearestStore.store_lat, lng: nearestStore.store_lng };
      remain.splice(nearestIdx, 1);
    }

    const newOrder = [...sortedUncompleted, ...completed];
    setDeliveries(newOrder);

    // Serverda tartibni yangilash
    try {
      await fetch('/api/deliveries/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordered_ids: newOrder.map(d => d.id) })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Do'konda ishni yakunlash ("BAJARILDI")
  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!completeModalItem) return;

    try {
      const res = await fetch(`/api/deliveries/${completeModalItem.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          karton_kg: kartonKg,
          salafan_kg: salafanKg,
          payment_type: paymentType,
          notes
        })
      });
      const data = await res.json();
      if (data.success) {
        const completedStore = completeModalItem;
        setCompleteModalItem(null);
        setKartonKg('');
        setSalafanKg('');
        setNotes('');
        const freshData = await loadData();
        // Avtomat keyingi marshrutni eng so'nggi do'kon joylashuvidan qayta hisoblash
        if (completedStore.store_lat && completedStore.store_lng) {
          applySorting({ lat: completedStore.store_lat, lng: completedStore.store_lng }, freshData);
        }
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  // Buyurtmani qoldirish ("TAYYORMAS" -> Ertangi kunga o'tadi)
  const handlePostponeSubmit = async (e) => {
    e.preventDefault();
    if (!postponeModalItem) return;

    try {
      const res = await fetch(`/api/deliveries/${postponeModalItem.id}/postpone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: postponeReason })
      });
      const data = await res.json();
      if (data.success) {
        setPostponeModalItem(null);
        alert('Buyurtma ertangi kungi dastafka reysiga muvaffaqiyatli surildi!');
        loadData();
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  // Qo'lda spidometr km kiritish
  const handleManualKmSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/trip/manual-km', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_km: manualKm })
      });
      const data = await res.json();
      if (data.success) {
        setShowManualKmModal(false);
        loadData();
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  // Joriy narxlar bo'yicha hisob
  const kartonPrice = Number(settings?.karton_buy_price || 1500);
  const salafanPrice = Number(settings?.salafan_buy_price || 3000);
  const calculatedTotal = (Number(kartonKg || 0) * kartonPrice) + (Number(salafanKg || 0) * salafanPrice);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      
      {/* 1. GAZ VA GPS MASOFA KALKULYATORI KARTASI */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Fuel className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Gaz va GPS Masofa Hisoblagich</h2>
              <p className="text-xs text-slate-400">
                1 ta to'liq zapravka: <span className="text-emerald-300 font-semibold">{trip?.refillPrice?.toLocaleString()} so'm</span> ({trip?.refillKm} km ga yetadi)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleGps}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-md ${
                gpsActive 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {gpsActive ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{gpsActive ? 'GPS Treker To\'xtatish' : 'GPS Treker Yoqish'}</span>
            </button>

            <button
              onClick={() => {
                setManualKm(trip?.total_km || 0);
                setShowManualKmModal(true);
              }}
              title="Spidometrdan qo'lda km kiritish"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hisob ko'rsatkichlari */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5">
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/40">
            <span className="text-xs text-slate-400 font-medium block">Yurilgan masofa</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {trip?.total_km || 0} <span className="text-sm font-semibold text-emerald-400">km</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              1 km = ~{trip?.costPerKm || 0} so'm
            </span>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/40">
            <span className="text-xs text-slate-400 font-medium block">Sarflangan Gaz summasi</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1">
              {trip?.gas_spent_sum?.toLocaleString() || 0} <span className="text-sm font-semibold text-white">so'm</span>
            </div>
            <span className="text-[11px] text-emerald-300/80 mt-1 block">
              Avtomatik chiqimga yoziladi
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-slate-800/60 p-4 rounded-xl border border-slate-700/40 flex flex-col justify-center">
            <span className="text-xs text-slate-400 font-medium block">GPS Holati</span>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`w-3 h-3 rounded-full ${gpsActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
              <span className="text-sm font-semibold text-slate-200">
                {gpsActive ? 'Real-vaqtda kuzatilmoqda' : 'Kutish rejimida'}
              </span>
            </div>
            {currentCoords && (
              <span className="text-[10px] text-slate-400 mt-1 block truncate">
                {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. REYS VA AQLLI MARSHRUT SARLAVHASI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
            <span>Bugungi Dastafka Reysi</span>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {deliveries.filter(d => d.status === 'KUTILMOQDA').length} ta qoldi
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Do'konlar ketma-ketligi va yetkazish harakatlari
          </p>
        </div>

        <button
          onClick={sortNearestFirst}
          disabled={isSorting}
          className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm ${
            isSorting 
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
              : 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800'
          }`}
        >
          {isSorting ? (
            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-600" />
          )}
          <span>{isSorting ? 'GPS qidirilmoqda...' : 'Eng yaqin do\'kondan boshlash (GPS)'}</span>
        </button>
      </div>

      {/* 2.5. XARITA (OBSHIY MARSHRUT) */}
      {!loading && deliveries.length > 0 && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative z-0">
          <MapContainer 
            center={
              currentCoords?.lat ? [currentCoords.lat, currentCoords.lng] : 
              (deliveries.find(d => d.store_lat)?.store_lat ? [deliveries.find(d => d.store_lat).store_lat, deliveries.find(d => d.store_lat).store_lng] : [41.2995, 69.2401])
            } 
            zoom={12} 
            style={{ height: '280px', width: '100%', borderRadius: '0.75rem' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {currentCoords?.lat && (
              <Marker position={[currentCoords.lat, currentCoords.lng]} icon={currentPosIcon}>
                <Popup>Sizning joriy manzilingiz</Popup>
              </Marker>
            )}
            {deliveries.filter(d => d.status === 'KUTILMOQDA' && d.store_lat).map((d, i) => (
              <Marker key={`marker-${d.id}`} position={[d.store_lat, d.store_lng]} icon={createNumberedIcon(i + 1)}>
                <Popup><b>{i+1}. {d.store_name}</b><br/>{d.store_address}</Popup>
              </Marker>
            ))}
            <Polyline 
              positions={[
                ...(currentCoords?.lat ? [[currentCoords.lat, currentCoords.lng]] : []),
                ...deliveries.filter(d => d.status === 'KUTILMOQDA' && d.store_lat).map(d => [d.store_lat, d.store_lng])
              ]} 
              color="#059669" 
              weight={3} 
              dashArray="5, 8" 
            />
          </MapContainer>
        </div>
      )}

      {/* 3. DO'KONLAR RO'YXATI */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Yuklanmoqda...</div>
      ) : deliveries.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-700">Bugungi reysda do'konlar yo'q</h4>
          <p className="text-sm text-slate-500 mt-1">
            Admin bo'limidan yoki do'konlar sahifasidan reysga do'kon qo'shing.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map((item, index) => {
            const isCompleted = item.status === 'BAJARILDI';
            const isPostponed = item.status === 'TAYYORMAS';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition shadow-sm p-4 sm:p-5 ${
                  isCompleted 
                    ? 'border-emerald-300 bg-emerald-50/30' 
                    : isPostponed 
                    ? 'border-amber-300 bg-amber-50/30' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  
                  {/* Do'kon nomi va ma'lumotlari */}
                  <div className="flex items-start space-x-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base font-bold text-slate-900">{item.store_name}</h4>
                        {isCompleted && (
                          <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Bajarildi</span>
                          </span>
                        )}
                        {isPostponed && (
                          <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Ertaga qoldirildi</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.store_address || 'Manzil ko\'rsatilmagan'}</span>
                        {item.store_contact && <span>({item.store_contact})</span>}
                      </p>

                      {/* Agar bajarilgan bo'lsa olingan vaznlar ko'rsatiladi */}
                      {isCompleted && (
                        <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                          <span className="bg-white border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold text-emerald-800">
                            📦 Karton: {item.karton_kg} kg ({item.karton_price_snapshot?.toLocaleString()} so'm)
                          </span>
                          <span className="bg-white border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold text-emerald-800">
                            🛍️ Salafan: {item.salafan_kg} kg ({item.salafan_price_snapshot?.toLocaleString()} so'm)
                          </span>
                          <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-bold">
                            Jami: {item.total_amount?.toLocaleString()} so'm ({item.payment_type})
                          </span>
                        </div>
                      )}

                      {/* Agar qoldirilgan bo'lsa sababi ko'rsatiladi */}
                      {isPostponed && (
                        <p className="text-xs text-amber-800 mt-2 bg-amber-100/70 px-3 py-1.5 rounded-lg font-medium">
                          Sababi: {item.postponed_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Navigatsiya va Telefon havolalari */}
                  <div className="flex items-center space-x-2 self-end sm:self-start">
                    {item.store_phone && (
                      <a
                        href={`tel:${item.store_phone}`}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                        title="Qo'ng'iroq qilish"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}

                    <a
                      href={`https://yandex.com/maps/?rtext=~${item.store_lat},${item.store_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition"
                      title="Yandex Navigatorda ochish"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Yandex</span>
                    </a>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${item.store_lat},${item.store_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition"
                      title="Google Maps da ochish"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Google</span>
                    </a>
                  </div>

                </div>

                {/* AMAL TUGMALARI (faqat Kutilmoqda bo'lsa) */}
                {item.status === 'KUTILMOQDA' && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={() => {
                        setPostponeModalItem(item);
                        setPostponeReason('Do\'kon yopiq / Mahsulot to\'planmagan');
                      }}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition"
                    >
                      ⏳ Tayyormas (Ertaga surish)
                    </button>

                    <button
                      onClick={() => {
                        setCompleteModalItem(item);
                        setKartonKg('');
                        setSalafanKg('');
                        setPaymentType('NAQD');
                        setNotes('');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>Mahsulot Qabul Qilish & Bajarildi</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MAHSULOT QABUL QILISH ("BAJARILDI") MODAL OYNASI */}
      {/* ========================================================= */}
      {completeModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {completeModalItem.store_name}
              </h3>
              <p className="text-xs text-slate-500">Mahsulot vaznini va to'lovni kiriting</p>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              
              {/* Karton vazni */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>📦 Karton / Makulatura (kg):</span>
                  <span className="text-emerald-700">1 kg = {kartonPrice?.toLocaleString()} so'm</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={kartonKg}
                  onChange={(e) => setKartonKg(e.target.value)}
                  placeholder="Masalan: 50"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800 text-base"
                />
              </div>

              {/* Salafan vazni */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>🛍️ Salafan / Paket (kg):</span>
                  <span className="text-emerald-700">1 kg = {salafanPrice?.toLocaleString()} so'm</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={salafanKg}
                  onChange={(e) => setSalafanKg(e.target.value)}
                  placeholder="Masalan: 12"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800 text-base"
                />
              </div>

              {/* Jami hisoblangan summa */}
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Jami to'lanadigan summa:</span>
                <span className="text-lg font-black text-emerald-700">
                  {calculatedTotal.toLocaleString()} so'm
                </span>
              </div>

              {/* To'lov turi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">To'lov usuli:</label>
                <div className="grid grid-cols-3 gap-2">
                  {['NAQD', 'KARTA', 'QARZ'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPaymentType(type)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        paymentType === type 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Izoh */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Qayd / Izoh (ixtiyoriy):</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Qo'shimcha izoh..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCompleteModalItem(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
                >
                  ✅ Tasdiqlash (Bajarildi)
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. TAYYORMAS (QOLDIRISH) MODAL OYNASI */}
      {/* ========================================================= */}
      {postponeModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Ertangi kunga qoldirish
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                "{postponeModalItem.store_name}" buyurtmasi ertangi kungi dastafkaga o'tkaziladi.
              </p>
            </div>

            <form onSubmit={handlePostponeSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sababini ko'rsating:
                </label>
                <textarea
                  rows="3"
                  value={postponeReason}
                  onChange={(e) => setPostponeReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500"
                  placeholder="Masalan: Do'kon egasi joyida yo'q yoki tovar kam"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPostponeModalItem(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow transition"
                >
                  ⏳ Ertaga o'tkazish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. QO'LDA SPIDOMETR KM KIRITISH MODAL OYNASI */}
      {/* ========================================================= */}
      {showManualKmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Spidometrdan km kiritish
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mashina spidometri bo'yicha bugun yurilgan umumiy masofani yozing.
              </p>
            </div>

            <form onSubmit={handleManualKmSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bugungi umumiy masofa (km):
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={manualKm}
                  onChange={(e) => setManualKm(e.target.value)}
                  placeholder="Masalan: 65"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowManualKmModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition"
                >
                  Saqlash va hisoblash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
