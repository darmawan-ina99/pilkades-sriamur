// Download PDF Rekap Keseluruhan Pilkades — dipakai di halaman Hasil
async function downloadRekapPDF() {
    Utils.toast("Membuat PDF...", "info");
    const resR = await Utils.api("rekap", {});
    if (!resR.ok) { Utils.toast("Gagal memuat data rekap", "error"); return; }
    const r = resR.rekap;
    const resC = await Utils.api("get_config", {});
    const cfg = resC.ok ? resC.config : null;
    const judul = cfg ? cfg.judul : "PILKADES SRIAMUR 2026";
    const desa = cfg ? cfg.desa : "Desa Sriamur";
    const now = new Date();
    const tgl = now.toLocaleDateString("id-ID", { day:"2-digit", month:"long", year:"numeric" });
    const jam = now.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit", timeZone:"Asia/Jakarta" }) + " WIB";

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = 210, ph = 297;
    const mx = 14;

    // Header bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pw, 28, "F");
    doc.setTextColor(255,255,255);
    doc.setFontSize(14);
    doc.setFont("helvetica","bold");
    doc.text(judul, mx, 12);
    doc.setFontSize(10);
    doc.setFont("helvetica","normal");
    doc.text("REKAPITULASI SUARA — " + desa, mx, 18);
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(8);
    doc.text("REALCOUNT INTERNAL / HASIL SEMENTARA", mx, 24);

    // Timestamp
    doc.setTextColor(100,116,139);
    doc.setFontSize(8);
    doc.text("Dibuat: " + tgl + " " + jam, pw - mx, 24, { align: "right" });

    // Summary section
    let y = 36;
    doc.setTextColor(15,23,42);
    doc.setFontSize(11);
    doc.setFont("helvetica","bold");
    doc.text("RINGKASAN", mx, y);
    y += 4;
    doc.setDrawColor(226,232,240);
    doc.line(mx, y, pw-mx, y);
    y += 6;

    const pctTPS = r.tps_total > 0 ? Math.round((r.tps_sudah / r.tps_total) * 100) : 0;
    doc.setFontSize(9);
    doc.setFont("helvetica","normal");
    doc.setTextColor(30,41,59);
    doc.text("TPS Terinput:", mx, y);
    doc.setFont("helvetica","bold");
    doc.text(r.tps_sudah + " / " + r.tps_total + " (" + pctTPS + "%)", mx + 40, y);
    y += 5;
    doc.setFont("helvetica","normal");
    doc.text("Total DPT:", mx, y);
    doc.setFont("helvetica","bold");
    doc.text(Utils.formatAngka(r.total_pemilih) + " jiwa", mx + 40, y);
    y += 5;
    doc.setFont("helvetica","normal");
    doc.text("Partisipasi:", mx, y);
    doc.setFont("helvetica","bold");
    doc.text(r.persentase_partisipasi + "%", mx + 40, y);
    y += 5;
    doc.setFont("helvetica","normal");
    doc.text("Suara Sah:", mx, y);
    doc.setFont("helvetica","bold");
    doc.setTextColor(22,163,74);
    doc.text(Utils.formatAngka(r.total_suara_sah), mx + 40, y);
    doc.setTextColor(30,41,59);
    y += 5;
    doc.setFont("helvetica","normal");
    doc.text("Suara Tidak Sah:", mx, y);
    doc.setFont("helvetica","bold");
    doc.setTextColor(220,38,38);
    doc.text(Utils.formatAngka(r.total_suara_tidak_sah), mx + 40, y);
    doc.setTextColor(30,41,59);
    y += 5;
    doc.setFont("helvetica","normal");
    doc.text("Abstain:", mx, y);
    doc.setFont("helvetica","bold");
    doc.setTextColor(245,158,11);
    doc.text(Utils.formatAngka(r.total_abstain), mx + 40, y);
    doc.setTextColor(30,41,59);
    y += 8;

    // Candidate results table
    doc.setFontSize(11);
    doc.setFont("helvetica","bold");
    doc.text("PEROLEHAN SUARA PER CALON", mx, y);
    y += 4;
    doc.line(mx, y, pw-mx, y);
    y += 3;

    const calonRows = r.calon.map((c, i) => {
      const pctS = r.total_suara_sah > 0 ? ((c.suara / r.total_suara_sah) * 100).toFixed(1) + "%" : "0%";
      const rank = i === 0 && c.suara > 0 ? "#1 UNGGUL" : "#" + (i+1);
      return [String(c.nomor_urut), c.nama || "Calon " + c.nomor_urut, Utils.formatAngka(c.suara), pctS, rank];
    });

    doc.autoTable({
      head: [["No.", "Nama Calon", "Suara", "Persentase", "Peringkat"]],
      body: calonRows,
      startY: y,
      margin: { left: mx, right: mx },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [15,23,42], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248,250,252] },
      columnStyles: { 0: { cellWidth: 15 }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "center" } }
    });

    y = doc.lastAutoTable.finalY + 10;

    // Detail per TPS table
    if (y > ph - 60) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont("helvetica","bold");
    doc.text("DETAIL SUARA PER TPS", mx, y);
    y += 4;
    doc.line(mx, y, pw-mx, y);
    y += 3;

    const tpsRows = r.detail_tps.map(t => {
      const status = t.status_input === "sudah" ? "Sudah" : "Belum";
      const calonSuara = r.calon.map(c => {
        const s = (t.suara_calon && t.suara_calon[c.nomor_urut]) || 0;
        return String(s);
      });
      return ["TPS " + t.nomor_tps, status, (t.nama_saksi || "-"), Utils.formatAngka(t.jumlah_pemilih), Utils.formatAngka(t.suara_sah), Utils.formatAngka(t.suara_tidak_sah), Utils.formatAngka(t.suara_abstain), ...calonSuara];
    });

    const tpsHead = ["TPS", "Status", "Saksi", "DPT", "Sah", "T.Sah", "Abst.", ...r.calon.map(c => "C" + c.nomor_urut)];
    doc.autoTable({
      head: [tpsHead],
      body: tpsRows,
      startY: y,
      margin: { left: mx, right: mx },
      styles: { fontSize: 6, cellPadding: 1.5 },
      headStyles: { fillColor: [15,23,42], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248,250,252] },
      columnStyles: { 1: { halign: "center" }, 2: { cellWidth: 30 }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } }
    });

    y = doc.lastAutoTable.finalY + 8;

    // Footer
    if (y > ph - 20) { doc.addPage(); y = 20; }
    doc.setDrawColor(226,232,240);
    doc.line(mx, y, pw-mx, y);
    y += 5;
    doc.setFontSize(7);
    doc.setTextColor(100,116,139);
    doc.setFont("helvetica","italic");
    doc.text("Dokumen ini adalah REALCOUNT INTERNAL / HASIL SEMENTARA.", mx, y);
    y += 4;
    doc.text("Data dihimpun dari laporan saksi TPS dan bukan hasil resmi penyelenggara pemilihan.", mx, y);
    y += 6;
    doc.setFont("helvetica","normal");
    doc.text("Dibuat otomatis pada " + tgl + " " + jam, mx, y);

    doc.save("Rekap_Pilkades_Sriamur_" + now.getTime() + ".pdf");
    Utils.toast("PDF berhasil diunduh!", "success");
  }
