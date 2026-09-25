import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Plus, 
  MapPin, 
  Phone, 
  Search, 
  Send, 
  Trash2, 
  Edit2, 
  Crosshair, 
  Check, 
  AlertCircle 
} from 'lucide-react';

export default function AdminStoresView() {
  const [stores, setStores] = useState([]);
  const [todayDeliveries, setTodayDeliveries] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Yangi / tahrirlash modal
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [networkName, setNetworkName] = useState('');
  const [lat, setLat] = useState('41.2995'); // Standart Toshkent
  const [lng, setLng] = useState('69.2401');
  const [locationInput, setLocationInput] = useState('');
  const [gpsDetecting, setGpsDetecting] = useState(false);

  // Tanlangan do'konlar (bir vaqtda bir nechta qo'shish)
  const [selectedStoreIds, setSelectedStoreIds] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resS, resD] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/deliveries')
      ]);
      const sData = await resS.json();
      const dData = await resD.json();

      setStores(Array.isArray(sData) ? sData : []);
      setTodayDeliveries(Array.isArray(dData) ? dData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mening GPS koordinatalarimni olish
  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolokatsiya qo\'llab-quvvatlanmaydi');
      return;
    }
    setGpsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGpsDetecting(false);
      },
      (err) => {
        alert('GPS aniqlanmadi: ' + err.message);
        setGpsDetecting(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Do'konni saqlash (Yangi yoki Tahrirlash)
  const handleSaveStore = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        phone,
        address,
        contact_person: contactPerson,
        network_name: networkName,
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      };

      if (editingStore) {
        await fetch(`/api/stores/${editingStore.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/stores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  const handleLocationInputChange = (e) => {
    const val = e.target.value;
    setLocationInput(val);
    
    let extractedLat = null;
    let extractedLng = null;

    // Qidiruv 1: 41.2995, 69.2401 yoki 41.2995 69.2401
    const coordMatch = val.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (coordMatch) {
      extractedLat = coordMatch[1];
      extractedLng = coordMatch[2];
    } else {
      // Qidiruv 2: Google Maps @41.2995,69.2401
      const gmapsMatch = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (gmapsMatch) {
        extractedLat = gmapsMatch[1];
        extractedLng = gmapsMatch[2];
      } else {
        // Qidiruv 3: Yandex Maps ?ll=69.2401%2C41.2995
        const yandexMatch = val.match(/[?&](?:ll|pt)=([-\d.]+)(?:%2C|,)([-\d.]+)/);
        if (yandexMatch) {
          extractedLng = yandexMatch[1];
          extractedLat = yandexMatch[2];
        }
      }
    }

    if (extractedLat && extractedLng) {
      setLat(extractedLat);
      setLng(extractedLng);
      
      // Qo'shimcha matnni "Do'kon nomi" ga o'tkazishga harakat qilamiz
      let cleanText = val
        .replace(/https?:\/\/[^\s]+/g, '') // URLlarni olib tashlash
        .replace(/\[\s*Геопозиция\s*\]/gi, '') // Telegram yozuvini olib tashlash
        .replace(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/g, '') // Koordinatalarni olib tashlash
        .trim();
      
      // Agar faqat belgilari qolib ketgan bo'lsa tozalash
      cleanText = cleanText.replace(/^[,\s]+|[,\s]+$/g, '').trim();

      if (cleanText && !name) { // Agar ism hali kiritilmagan bo'lsa
        setName(cleanText);
      }
    }
  };

  const resetForm = () => {
    setEditingStore(null);
    setName('');
    setPhone('');
    setAddress('');
    setContactPerson('');
    setNetworkName('');
    setLat('41.2995');
    setLng('69.2401');
    setLocationInput('');
  };

  const handleEditClick = (store) => {
    setEditingStore(store);
    setName(store.name);
    setPhone(store.phone || '');
    setAddress(store.address || '');
    setContactPerson(store.contact_person || '');
    setNetworkName(store.network_name || '');
    setLat(store.lat.toString());
    setLng(store.lng.toString());
    setLocationInput('');
    setShowModal(true);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Haqiqatan ham bu do\'konni o\'chirmoqchimisiz?')) return;
    try {
      const res = await fetch(`/api/stores/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Server xatosi');
      }
      loadData();
    } catch (err) {
      alert('O\'chirishda xatolik: ' + err.message);
    }
  };

  // Tanlangan do'konlarni bugungi dastafkaga biriktirish
  const handleAssignToDelivery = async (storeIds) => {
    if (!storeIds || storeIds.length === 0) return;
    try {
      const res = await fetch('/api/deliveries/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_ids: storeIds })
      });
      const data = await res.json();
      if (data.success) {
        if (data.addedCount > 0) {
          alert(`${data.addedCount} ta do'kon bugungi dastafka ro'yxatiga qo'shildi!\nEndi yuqoridagi "Dastafka & Gaz" bo'limiga o'tib ishingizni davom ettirishingiz mumkin.`);
        } else {
          alert(`Bu do'konlar allaqachon bugungi reysda mavjud!\nIltimos, yuqoridagi "Dastafka & Gaz" bo'limiga o'ting.`);
        }
        setSelectedStoreIds([]);
        loadData();
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  // Filtrlash
  const filteredStores = stores.filter(s => 
    (s.name && s.name.toLowerCase().includes(search.toLowerCase())) ||
    (s.address && s.address.toLowerCase().includes(search.toLowerCase())) ||
    (s.contact_person && s.contact_person.toLowerCase().includes(search.toLowerCase())) ||
    (s.network_name && s.network_name.toLowerCase().includes(search.toLowerCase()))
  );

  const isStoreInTodayDelivery = (storeId) => {
    return todayDeliveries.some(d => d.store_id === storeId);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Sarlavha & Amallar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Store className="w-6 h-6 text-emerald-600" />
            <span>Do'konlar (Mijozlar) Bazasi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Do'konlar va ularning GPS lokatsiyasini bir marta saqlang, keyin oson dastafkaga yuboring
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {selectedStoreIds.length > 0 && (
            <button
              onClick={() => handleAssignToDelivery(selectedStoreIds)}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Tanlanganlarni ({selectedStoreIds.length}) Reysga yuborish</span>
            </button>
          )}

          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Do'kon Qo'shish</span>
          </button>
        </div>
      </div>

      {/* Qidiruv */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Do'kon nomi, manzili yoki telefon raqami bo'yicha qidirish..."
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm"
        />
      </div>

      {/* Do'konlar ro'yxati */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Yuklanmoqda...</div>
      ) : filteredStores.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-700">Do'konlar topilmadi</h4>
          <p className="text-sm text-slate-500 mt-1">Yangi do'kon qo'shish tugmasini bosing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStores.map((store) => {
            const inToday = isStoreInTodayDelivery(store.id);
            const isSelected = selectedStoreIds.includes(store.id);

            return (
              <div
                key={store.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 transition shadow-sm flex flex-col justify-between ${
                  inToday ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {!inToday && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStoreIds([...selectedStoreIds, store.id]);
                            } else {
                              setSelectedStoreIds(selectedStoreIds.filter(id => id !== store.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      )}
                      <h3 className="text-base font-bold text-slate-900">{store.name}</h3>
                      {store.network_name && (
                        <span className="ml-2 bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {store.network_name}
                        </span>
                      )}
                    </div>

                    {inToday ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Bugungi reysda</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAssignToDelivery([store.id])}
                        className="text-xs font-semibold px-2.5 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg transition flex items-center space-x-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Reysga qo'shish</span>
                      </button>
                    )}
                  </div>

                  <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                    <p className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{store.address || 'Manzil ko\'rsatilmagan'}</span>
                    </p>
                    {store.phone && (
                      <p className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{store.phone}</span>
                        {store.contact_person && <span>({store.contact_person})</span>}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400">
                      GPS: {store.lat.toFixed(4)}, {store.lng.toFixed(4)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={`https://yandex.com/maps/?rtext=~${store.lat},${store.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-emerald-600 hover:underline flex items-center space-x-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Xaritada ko'rish</span>
                  </a>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEditClick(store)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      title="Tahrirlash"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(store.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* DO'KON QO'SHISH / TAHRIRLASH MODALI */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {editingStore ? 'Do\'kon ma\'lumotlarini tahrirlash' : 'Yangi Do\'kon Qo\'shish'}
              </h3>
              <p className="text-xs text-slate-500">
                Do'kon nomi, manzili va xaritadagi aniq lokatsiyasini kiriting
              </p>
            </div>

            <form onSubmit={handleSaveStore} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Do'kon nomi *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: 'Baraka Savdo' yoki '5-Magazin'"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefon raqam
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mas'ul shaxs (Ismi)
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Masalan: Alisher aka"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Set (Tarmoq) nomi
                  </label>
                  <input
                    type="text"
                    value={networkName}
                    onChange={(e) => setNetworkName(e.target.value)}
                    placeholder="Masalan: Fikx, Havas (Bitta xo'jayinga tegishli do'konlar)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mo'ljal / Aniq manzil
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Masalan: Chilonzor 9-mavze, poliklinika ro'parasi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* GPS Lokatsiya */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>GPS Koordinatalari (Lokatsiya)</span>
                  </span>
                  <button
                    type="button"
                    onClick={detectCurrentLocation}
                    disabled={gpsDetecting}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition flex items-center space-x-1"
                  >
                    <Crosshair className={`w-3 h-3 ${gpsDetecting ? 'animate-spin' : ''}`} />
                    <span>{gpsDetecting ? 'Aniqlanmoqda...' : 'Hozirgi joyimni olish'}</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telegram yoki Xaritadan lokatsiya ssilkasi (havola)
                  </label>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={handleLocationInputChange}
                    placeholder="Masalan: 41.2995, 69.2401 yoki https://yandex.uz/maps/..."
                    className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 placeholder-emerald-400/70"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    Lokatsiya ssilkasini yoki koordinatani shu yerga tashlasangiz (paste qilsangiz), quyidagi raqamlar avtomat to'ldiriladi.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Kenglik (Latitude):</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Uzunlik (Longitude):</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
