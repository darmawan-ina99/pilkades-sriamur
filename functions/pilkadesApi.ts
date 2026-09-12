import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const body = req.method === "POST" ? await req.json() : {};
    const action = body.action || new URL(req.url).searchParams.get("action");

    if (action === "init_data") {
      const tpsCount = await db.PilkadesTPS.list();
      if (tpsCount.length > 0) return json({ ok: true, pesan: "Data sudah ada", tps: tpsCount.length });
      for (let i = 1; i <= 40; i++) {
        await db.PilkadesTPS.create({ nomor_tps: i, status_input: "belum", jumlah_pemilih: 0, suara_sah: 0, suara_tidak_sah: 0, suara_abstain: 0, total_suara_masuk: 0, catatan: "", waktu_input: "" });
      }
      return json({ ok: true, pesan: "40 TPS dibuat" });
    }

    if (action === "get_config") {
      const configList = await db.PilkadesConfig.list();
      if (configList.length === 0) return json({ ok: true, config: { judul: "Pemilihan Kepala Desa Sriamur 2024", subjudul: "Pusat Tabulasi Suara · 40 TPS · 4 Calon", desa: "Desa Sriamur", total_dpt: 0 } });
      const c = configList[0];
      return json({ ok: true, config: { judul: c.judul || "", subjudul: c.subjudul || "", desa: c.desa || "", total_dpt: c.total_dpt || 0, id: c.id } });
    }

    if (action === "set_config") {
      const { judul, subjudul, desa, total_dpt } = body;
      const configList = await db.PilkadesConfig.list();
      if (configList.length === 0) {
        await db.PilkadesConfig.create({ judul, subjudul, desa, total_dpt: total_dpt || 0 });
      } else {
        const updateData: any = {};
        if (judul !== undefined) updateData.judul = judul;
        if (subjudul !== undefined) updateData.subjudul = subjudul;
        if (desa !== undefined) updateData.desa = desa;
        if (total_dpt !== undefined) updateData.total_dpt = total_dpt;
        await db.PilkadesConfig.update(configList[0].id, updateData);
      }
      if (total_dpt && total_dpt > 0) {
        const tpsList = await db.PilkadesTPS.list();
        tpsList.sort((a: any, b: any) => a.nomor_tps - b.nomor_tps);
        const base = Math.floor(total_dpt / tpsList.length);
        const sisa = total_dpt - (base * tpsList.length);
        for (let i = 0; i < tpsList.length; i++) {
          const dpt = base + (i < sisa ? 1 : 0);
          await db.PilkadesTPS.update(tpsList[i].id, { jumlah_pemilih: dpt });
        }
      }
      return json({ ok: true, pesan: "Konfigurasi disimpan" });
    }

    if (action === "set_dpt_all") {
      const totalDPT = body.total_dpt || 0;
      if (!totalDPT) return json({ ok: false, pesan: "Total DPT wajib diisi" }, 400);
      const tpsList = await db.PilkadesTPS.list();
      tpsList.sort((a: any, b: any) => a.nomor_tps - b.nomor_tps);
      const base = Math.floor(totalDPT / tpsList.length);
      const sisa = totalDPT - (base * tpsList.length);
      for (let i = 0; i < tpsList.length; i++) {
        const dpt = base + (i < sisa ? 1 : 0);
        await db.PilkadesTPS.update(tpsList[i].id, { jumlah_pemilih: dpt });
      }
      const configList = await db.PilkadesConfig.list();
      if (configList.length > 0) await db.PilkadesConfig.update(configList[0].id, { total_dpt: totalDPT });
      return json({ ok: true, pesan: `DPT ${totalDPT} jiwa didistribusi ke ${tpsList.length} TPS` });
    }

    if (action === "setup_calon") {
      const calonList = body.calon || [];
      for (const c of calonList) await db.PilkadesCalon.create({ nomor_urut: c.nomor, nama: c.nama, total_suara: 0, foto: c.foto || "" });
      return json({ ok: true, pesan: `${calonList.length} calon disimpan` });
    }

    if (action === "update_calon") {
      const { id, nama, foto } = body;
      if (!id) return json({ ok: false, pesan: "ID wajib" }, 400);
      const updateData: any = {};
      if (nama !== undefined) updateData.nama = nama;
      if (foto !== undefined) updateData.foto = foto;
      await db.PilkadesCalon.update(id, updateData);
      return json({ ok: true, pesan: "Calon diperbarui" });
    }

    if (action === "get_calon") {
      const calon = await db.PilkadesCalon.list();
      calon.sort((a: any, b: any) => a.nomor_urut - b.nomor_urut);
      return json({ ok: true, calon });
    }

    if (action === "get_tps") {
      const tps = await db.PilkadesTPS.list();
      tps.sort((a: any, b: any) => a.nomor_tps - b.nomor_tps);
      return json({ ok: true, tps });
    }

    if (action === "get_suara_tps") {
      const nomor = body.nomor_tps || parseInt(new URL(req.url).searchParams.get("nomor") || "0");
      const suara = await db.PilkadesSuara.filter({ nomor_tps: nomor });
      return json({ ok: true, suara });
    }

    if (action === "input_suara") {
      const { nomor_tps, jumlah_pemilih, suara_sah, suara_tidak_sah, suara_abstain, suara_calon, catatan } = body;
      const tpsList = await db.PilkadesTPS.filter({ nomor_tps });
      if (!tpsList.length) return json({ ok: false, pesan: "TPS tidak ditemukan" }, 404);
      const tps = tpsList[0];
      const total_masuk = suara_sah + suara_tidak_sah + suara_abstain;
      await db.PilkadesTPS.update(tps.id, { jumlah_pemilih, suara_sah, suara_tidak_sah, suara_abstain, total_suara_masuk: total_masuk, status_input: "sudah", catatan: catatan || "", waktu_input: new Date().toISOString() });
      const suaraLama = await db.PilkadesSuara.filter({ nomor_tps });
      for (const sl of suaraLama) await db.PilkadesSuara.delete(sl.id);
      for (const sc of suara_calon) await db.PilkadesSuara.create({ tps_id: tps.id, nomor_tps, calon_id: sc.calon_id, nomor_urut: sc.nomor_urut, jumlah_suara: sc.jumlah_suara });
      const allSuara = await db.PilkadesSuara.list();
      const calonList = await db.PilkadesCalon.list();
      for (const c of calonList) {
        const total = allSuara.filter((s: any) => s.calon_id === c.id).reduce((sum: number, s: any) => sum + (s.jumlah_suara || 0), 0);
        await db.PilkadesCalon.update(c.id, { total_suara: total });
      }
      return json({ ok: true, pesan: `TPS ${nomor_tps} berhasil diinput` });
    }

    if (action === "rekap") {
      const tps = await db.PilkadesTPS.list();
      const calon = await db.PilkadesCalon.list();
      const allSuara = await db.PilkadesSuara.list();
      tps.sort((a: any, b: any) => a.nomor_tps - b.nomor_tps);
      const tpsSudah = tps.filter((t: any) => t.status_input === "sudah");
      const tpsBelum = tps.filter((t: any) => t.status_input === "belum");
      const totalPemilih = tps.reduce((s: number, t: any) => s + (t.jumlah_pemilih || 0), 0);
      const totalSah = tps.reduce((s: number, t: any) => s + (t.suara_sah || 0), 0);
      const totalTidakSah = tps.reduce((s: number, t: any) => s + (t.suara_tidak_sah || 0), 0);
      const totalAbstain = tps.reduce((s: number, t: any) => s + (t.suara_abstain || 0), 0);
      const totalMasuk = tps.reduce((s: number, t: any) => s + (t.total_suara_masuk || 0), 0);
      const calonSuara = calon.map((c: any) => ({ ...c, suara: allSuara.filter((s: any) => s.calon_id === c.id).reduce((sum: number, s: any) => sum + (s.jumlah_suara || 0), 0) })).sort((a: any, b: any) => b.suara - a.suara);
      const detailTPS = tps.map((t: any) => {
        const suaraCalon: Record<number, number> = {};
        calon.forEach((c: any) => { suaraCalon[c.nomor_urut] = allSuara.filter((s: any) => s.nomor_tps === t.nomor_tps && s.calon_id === c.id).reduce((sum: number, s: any) => sum + (s.jumlah_suara || 0), 0); });
        return { ...t, suara_calon: suaraCalon };
      });
      return json({ ok: true, rekap: { tps_sudah: tpsSudah.length, tps_belum: tpsBelum.length, tps_total: tps.length, total_pemilih: totalPemilih, total_suara_sah: totalSah, total_suara_tidak_sah: totalTidakSah, total_abstain: totalAbstain, total_suara_masuk: totalMasuk, persentase_partisipasi: totalPemilih > 0 ? Math.round((totalMasuk / totalPemilih) * 100) : 0, calon: calonSuara, detail_tps: detailTPS, tps_belum_list: tpsBelum.map((t: any) => t.nomor_tps) } });
    }

    if (action === "reset_tps") {
      const { nomor_tps } = body;
      const tpsList = await db.PilkadesTPS.filter({ nomor_tps });
      if (!tpsList.length) return json({ ok: false, pesan: "TPS tidak ditemukan" }, 404);
      const tps = tpsList[0];
      await db.PilkadesTPS.update(tps.id, { status_input: "belum", suara_sah: 0, suara_tidak_sah: 0, suara_abstain: 0, total_suara_masuk: 0, catatan: "", waktu_input: "" });
      const suaraLama = await db.PilkadesSuara.filter({ nomor_tps });
      for (const sl of suaraLama) await db.PilkadesSuara.delete(sl.id);
      const allSuara = await db.PilkadesSuara.list();
      const calonList = await db.PilkadesCalon.list();
      for (const c of calonList) {
        const total = allSuara.filter((s: any) => s.calon_id === c.id).reduce((sum: number, s: any) => sum + (s.jumlah_suara || 0), 0);
        await db.PilkadesCalon.update(c.id, { total_suara: total });
      }
      return json({ ok: true, pesan: `TPS ${nomor_tps} direset` });
    }

    return json({ ok: false, pesan: "Action tidak dikenali" }, 400);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: msg }, 500);
  }
});
