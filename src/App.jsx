import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';

// ==========================================
// 1. 設定與初始化 (請填入你的金鑰)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC8PjCBiK3j0YKLNQdhj0M6SCpUt3gF7DQ",
  authDomain: "ai-homework-5dcf3.firebaseapp.com",
  projectId: "ai-homework-5dcf3",
  storageBucket: "ai-homework-5dcf3.firebasestorage.app",
  messagingSenderId: "909084261985",
  appId: "1:909084261985:web:61dd8e59e982e6d3577420",
  measurementId: "G-2LF9Y4BHM6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";

// 假設民宿總房間數為 10
const TOTAL_ROOMS = 10; 

// ==========================================
// 2. 樣式定義 (Inline CSS)
// ==========================================
const styles = {
  app: { fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' },
  container: { maxWidth: '1000px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, color: '#333' },
  button: { padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#0056b3', color: '#fff', cursor: 'pointer', fontWeight: 'bold' },
  buttonDanger: { backgroundColor: '#dc3545' },
  buttonSuccess: { backgroundColor: '#28a745' },
  card: { backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '20px' },
  input: { width: '100%', padding: '10px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' },
  row: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
  col: { flex: 1, minWidth: '200px' },
  // 聊天室樣式
  chatBox: { height: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px', padding: '10px', marginBottom: '10px', backgroundColor: '#fafafa' },
  bubbleUser: { backgroundColor: '#007bff', color: '#fff', padding: '10px', borderRadius: '15px 15px 0 15px', margin: '5px 0', alignSelf: 'flex-end', maxWidth: '80%', width: 'fit-content', marginLeft: 'auto' },
  bubbleAi: { backgroundColor: '#e9ecef', color: '#333', padding: '10px', borderRadius: '15px 15px 15px 0', margin: '5px 0', alignSelf: 'flex-start', maxWidth: '80%', width: 'fit-content' },
  // 儀表板樣式
  statsGrid: { display: 'flex', gap: '15px', marginBottom: '20px' },
  statCard: { flex: 1, padding: '20px', borderRadius: '12px', color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  // 表格樣式
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: { borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left' },
  td: { borderBottom: '1px solid #ddd', padding: '10px' },
  // 載入遮罩
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, fontSize: '24px', fontWeight: 'bold', color: '#333' }
};

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const adminState = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminState);
    setLoading(false); // 初始載入完成
  }, []);

  const toggleAdmin = () => {
    if (isAdmin) {
      localStorage.setItem('isAdmin', 'false');
      setIsAdmin(false);
    } else {
      const pwd = prompt("請輸入管理員密碼：");
      if (pwd === "1234") {
        localStorage.setItem('isAdmin', 'true');
        setIsAdmin(true);
      } else {
        alert("密碼錯誤");
      }
    }
  };

  return (
    <div style={styles.app}>
      {loading && <div style={styles.overlay}>系統載入中...</div>}
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>AI 智慧民宿系統</h1>
          <button style={styles.button} onClick={toggleAdmin}>
            {isAdmin ? '切換為顧客端' : '管理員登入'}
          </button>
        </div>
        
        {isAdmin ? <AdminDashboard db={db} setLoading={setLoading} /> : <CustomerView db={db} setLoading={setLoading} />}
      </div>
    </div>
  );
}

// ==========================================
// 3. 顧客端介面
// ==========================================
function CustomerView({ db, setLoading }) {
  const [form, setForm] = useState({ dateIn: '', dateOut: '', roomType: '標準雙人房', name: '', phone: '' });
  const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: '您好！我是 AI 客服，請問有什麼我可以協助您的嗎？' }]);
  const [chatInput, setChatInput] = useState('');

  // 處理訂房邏輯
  const handleBooking = async (e) => {
    e.preventDefault();
    if (!form.dateIn || !form.dateOut || !form.name || !form.phone) return alert('請填寫完整資訊');
    if (form.dateIn >= form.dateOut) return alert('退房日期必須大於入住日期');

    setLoading(true);
    try {
      // 驗證是否重複訂房 (邏輯缺陷：併發寫入時仍會產生 Race Condition)
      const q = query(
        collection(db, "bookings"), 
        where("roomType", "==", form.roomType),
        where("dateIn", "==", form.dateIn)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        alert('抱歉，該房型在您選擇的日期已被預訂。');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "bookings"), {
        ...form,
        status: '未確認',
        timestamp: new Date()
      });
      alert('訂房申請已送出！');
      setForm({ dateIn: '', dateOut: '', roomType: '標準雙人房', name: '', phone: '' });
    } catch (error) {
      console.error(error);
      alert('發生錯誤');
    }
    setLoading(false);
  };

  // 呼叫 Gemini API
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const newHistory = [...chatHistory, { role: 'user', text: chatInput }];
    setChatHistory(newHistory);
    setChatInput('');

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `你是一個民宿客服機器人。請簡短回答以下問題：${chatInput}` }] }]
        })
      });
      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "抱歉，我目前無法回應。";
      setChatHistory(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'ai', text: '系統連線異常，請稍後再試。' }]);
    }
  };

  return (
    <div>
      <div style={styles.card}>
        <h3>AI 智慧客服</h3>
        <div style={styles.chatBox}>
          {chatHistory.map((msg, i) => (
            <div key={i} style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi}>
              {msg.text}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input style={styles.input} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendChatMessage()} placeholder="詢問入住規定、周邊景點..." />
          <button style={styles.button} onClick={sendChatMessage}>發送</button>
        </div>
      </div>

      <div style={styles.card}>
        <h3>線上訂房</h3>
        <form onSubmit={handleBooking}>
          <div style={styles.row}>
            <div style={styles.col}>
              <label>入住日期</label>
              <input type="date" style={styles.input} value={form.dateIn} onChange={e => setForm({...form, dateIn: e.target.value})} />
            </div>
            <div style={styles.col}>
              <label>退房日期</label>
              <input type="date" style={styles.input} value={form.dateOut} onChange={e => setForm({...form, dateOut: e.target.value})} />
            </div>
          </div>
          <div style={styles.row}>
            <div style={styles.col}>
              <label>房型</label>
              <select style={styles.input} value={form.roomType} onChange={e => setForm({...form, roomType: e.target.value})}>
                <option value="標準雙人房">標準雙人房</option>
                <option value="豪華四人房">豪華四人房</option>
                <option value="家庭包棟">家庭包棟</option>
              </select>
            </div>
            <div style={styles.col}>
              <label>姓名</label>
              <input type="text" style={styles.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
          </div>
          <label>聯絡電話</label>
          <input type="text" style={styles.input} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          <button type="submit" style={{...styles.button, width: '100%', marginTop: '10px'}}>送出訂單</button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 4. 管理者端介面
// ==========================================
function AdminDashboard({ db, setLoading }) {
  const [orders, setOrders] = useState([]);
  
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "bookings"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(data);
    } catch (error) {
      console.error("讀取失敗", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === '已確認' ? '未確認' : '已確認';
    await updateDoc(doc(db, "bookings", id), { status: newStatus });
    fetchOrders();
  };

  const deleteOrder = async (id) => {
    if (window.confirm("確定刪除此訂單？")) {
      await deleteDoc(doc(db, "bookings", id));
      fetchOrders();
    }
  };

  // 統計數據計算
  const today = new Date().toISOString().split('T')[0];
  const todayCheckIns = orders.filter(o => o.dateIn === today).length;
  // 簡化的剩餘空房邏輯：總房數 - 今日入住數
  const availableRooms = TOTAL_ROOMS - todayCheckIns; 

  return (
    <div>
      <div style={styles.statsGrid}>
        <div style={{...styles.statCard, backgroundColor: '#17a2b8'}}>總訂單數<br/>{orders.length}</div>
        <div style={{...styles.statCard, backgroundColor: '#28a745'}}>今日入住<br/>{todayCheckIns}</div>
        <div style={{...styles.statCard, backgroundColor: '#ffc107', color: '#000'}}>剩餘空房<br/>{availableRooms}</div>
      </div>

      <div style={styles.card}>
        <h3>訂單管理列表</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>日期區間</th>
                <th style={styles.th}>房型</th>
                <th style={styles.th}>客戶資訊</th>
                <th style={styles.th}>狀態</th>
                <th style={styles.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td style={styles.td}>{order.dateIn} ~ {order.dateOut}</td>
                  <td style={styles.td}>{order.roomType}</td>
                  <td style={styles.td}>{order.name} ({order.phone})</td>
                  <td style={styles.td}>
                    <span style={{ color: order.status === '已確認' ? 'green' : 'red', fontWeight: 'bold' }}>
                      {order.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button style={{...styles.button, ...styles.buttonSuccess, marginRight: '5px', padding: '5px 10px'}} onClick={() => toggleStatus(order.id, order.status)}>切換狀態</button>
                    <button style={{...styles.button, ...styles.buttonDanger, padding: '5px 10px'}} onClick={() => deleteOrder(order.id)}>刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
