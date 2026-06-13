const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Bot telah aktif sebagai ${client.user.tag}`);
});

async function askQuestionText(channel, userId, questionText, footerText) {
    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setAuthor({ name: '🩺 Asisten Kesehatan AI' })
        .setDescription(`**${questionText}**`)
        .setFooter({ text: footerText || 'Ketik "batal" untuk membatalkan.' });

    await channel.send({ embeds: [embed] });

    const filter = (m) => m.author.id === userId;
    try {
        const collected = await channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
        const answer = collected.first().content.trim().toLowerCase();

        if (answer === 'batal') {
            await channel.send("❌ **Sesi dibatalkan.**");
            return null;
        }
        return answer;
    } catch (error) {
        await channel.send("⏳ **Waktu habis.** Sesi dibatalkan karena tidak ada respons.");
        return null;
    }
}


async function askQuestionButton(channel, userId, questionText, buttonsData) {
    const rows = [];
    
   
    for (let i = 0; i < buttonsData.length; i += 5) {
        const row = new ActionRowBuilder();
        const chunk = buttonsData.slice(i, i + 5);
        chunk.forEach(btn => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(btn.id)
                    .setLabel(btn.label)
                    .setStyle(btn.style || ButtonStyle.Primary)
            );
        });
        rows.push(row);
    }

    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setAuthor({ name: '🩺 Asisten Kesehatan AI' })
        .setDescription(`**${questionText}**`)
        .setFooter({ text: 'Klik salah satu tombol di bawah ini.' });

    const msg = await channel.send({ embeds: [embed], components: rows });

    // Filter agar hanya user yang memanggil command yang bisa klik tombol
    const filter = (interaction) => interaction.user.id === userId;

    try {
        const interaction = await msg.awaitMessageComponent({ 
            filter, 
            time: 60000, 
            componentType: ComponentType.Button 
        });
        
      
        const disabledRows = rows.map(row => {
            const newRow = new ActionRowBuilder();
            row.components.forEach(c => {
                newRow.addComponents(ButtonBuilder.from(c).setDisabled(true));
            });
            return newRow;
        });
        
        await interaction.update({ components: disabledRows });
        return interaction.customId; // Mengembalikan ID dari tombol yang diklik
    } catch (error) {
        await msg.edit({ components: [] }); // Hapus tombol jika waktu habis
        await channel.send("⏳ **Waktu habis.** Sesi dibatalkan.");
        return null;
    }
}

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;



    if (message.content.toLowerCase() === "!diabetes") {
        const channel = message.channel;
        const userId = message.author.id;

        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('👋 Halo! Mari periksa risiko kesehatan Anda.')
            .setDescription('Jawab pertanyaan berikut dengan mengetik atau mengklik tombol yang tersedia.\n\n*Proses ini memakan waktu kurang dari 1 menit.*');
        await channel.send({ embeds: [welcomeEmbed] });

     
        
        const age = await askQuestionText(channel, userId, "Berapa usia Anda saat ini?", "Ketik angka (contoh: 45)");
        if (!age) return;

        const hypertension = await askQuestionButton(channel, userId, "Apakah Anda memiliki riwayat Hipertensi (Darah Tinggi)?", [
            { id: '1', label: 'Ya', style: ButtonStyle.Danger },
            { id: '0', label: 'Tidak', style: ButtonStyle.Success }
        ]);
        if (!hypertension) return;

        const heartDisease = await askQuestionButton(channel, userId, "Apakah Anda memiliki riwayat Penyakit Jantung?", [
            { id: '1', label: 'Ya', style: ButtonStyle.Danger },
            { id: '0', label: 'Tidak', style: ButtonStyle.Success }
        ]);
        if (!heartDisease) return;

        const bmi = await askQuestionText(channel, userId, "Berapa nilai BMI (Indeks Massa Tubuh) Anda?", "Ketik angka (contoh: 25.5)");
        if (!bmi) return;

        const hba1c = await askQuestionText(channel, userId, "Berapa level HbA1c Anda?", "Ketik angka (contoh: 5.7)");
        if (!hba1c) return;

        const glucose = await askQuestionText(channel, userId, "Berapa level Glukosa Darah Anda?", "Ketik angka (contoh: 100)");
        if (!glucose) return;

        const gender = await askQuestionButton(channel, userId, "Apa jenis kelamin Anda?", [
            { id: 'male', label: 'Pria', style: ButtonStyle.Primary },
            { id: 'female', label: 'Wanita', style: ButtonStyle.Primary },
            { id: 'other', label: 'Lainnya', style: ButtonStyle.Secondary }
        ]);
        if (!gender) return;

        const smoking = await askQuestionButton(channel, userId, "Bagaimana status merokok Anda saat ini?", [
            { id: 'never', label: 'Tidak Pernah', style: ButtonStyle.Success },
            { id: 'current', label: 'Masih Merokok', style: ButtonStyle.Danger },
            { id: 'former', label: 'Mantan Perokok', style: ButtonStyle.Secondary },
            { id: 'notcurrent', label: 'Sedang Berhenti', style: ButtonStyle.Secondary },
            { id: 'ever', label: 'Pernah Merokok', style: ButtonStyle.Secondary },
            { id: 'noinfo', label: 'Tidak Ada Info', style: ButtonStyle.Secondary }
        ]);
        if (!smoking) return;

       
        
        const loadingEmbed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setDescription('⏳ **Sedang menganalisis data Anda menggunakan AI...**');
        const loadingMessage = await channel.send({ embeds: [loadingEmbed] });

        const payload = {
            age: Number(age),
            hypertension: Number(hypertension),
            heart_disease: Number(heartDisease),
            bmi: Number(bmi),
            HbA1c_level: Number(hba1c),
            blood_glucose_level: Number(glucose),
            gender_Female: gender === "female" ? 1 : 0,
            gender_Male: gender === "male" ? 1 : 0,
            gender_Other: gender === "other" ? 1 : 0,
            smoking_NoInfo: smoking === "noinfo" ? 1 : 0,
            smoking_current: smoking === "current" ? 1 : 0,
            smoking_ever: smoking === "ever" ? 1 : 0,
            smoking_former: smoking === "former" ? 1 : 0,
            smoking_never: smoking === "never" ? 1 : 0,
            smoking_not_current: smoking === "notcurrent" ? 1 : 0
        };

        try {
            const response = await fetch("http://127.0.0.1:8080/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            const isDiabetes = result.prediction === 1;

            const resultEmbed = new EmbedBuilder()
                .setTitle(isDiabetes ? '⚠️ Peringatan: Risiko Tinggi' : '✅ Aman: Risiko Rendah')
                .setColor(isDiabetes ? 0xE74C3C : 0x2ECC71)
                .setDescription(`Terima kasih telah menunggu, **${message.author.username}**. Berikut adalah hasil analisis sistem kami:`)
                .addFields(
                    { name: 'Status Terdeteksi', value: isDiabetes ? '**Terindikasi Diabetes**' : '**Tidak Terindikasi Diabetes**', inline: true },
                    { name: 'Akurasi Probabilitas', value: `${(result.probability * 100).toFixed(2)}%`, inline: true }
                )
                .setFooter({ text: 'Disclaimer: Prediksi ini bersifat simulasi dan bukan diagnosis medis mutlak.' })
                .setTimestamp();

            await loadingMessage.delete();
            await channel.send({ embeds: [resultEmbed] });

        } catch (error) {
            await loadingMessage.delete();
            await channel.send("❌ **Gagal terhubung ke sistem analisis.** Pastikan server AI berjalan dengan baik.");
        }
    }
       const args = message.content.split(" ");
     if (args[0].toLowerCase() === "!bmi") {
        if (args.length < 3) {
            return message.reply("Format: `!bmi <berat_kg> <tinggi_cm>`\nContoh: `!bmi 70 175`");
        }

        const berat = parseFloat(args[1]);
        const tinggiCm = parseFloat(args[2]);

        if (isNaN(berat) || isNaN(tinggiCm)) {
            return message.reply("Berat dan tinggi harus berupa angka.");
        }

        const tinggiM = tinggiCm / 100;
        const bmi = berat / (tinggiM * tinggiM);

        let kategori;

        if (bmi < 18.5) kategori = "Kurus";
        else if (bmi < 25) kategori = "Normal";
        else if (bmi < 30) kategori = "Kelebihan Berat Badan";
        else kategori = "Obesitas";

        message.reply(
            `📊 BMI Anda: **${bmi.toFixed(2)}**\n🏷️ Kategori: **${kategori}**`
        );
    }
    if (args[0].toLowerCase() === "!kalori") {
      if (args.length < 5) {
          return message.reply(
              "Format: `!kalori <pria/wanita> <berat_kg> <tinggi_cm> <umur>`\n" +
              "Contoh: `!kalori pria 70 175 20`"
          );
      }

      const gender = args[1].toLowerCase();
      const berat = parseFloat(args[2]);
      const tinggi = parseFloat(args[3]);
      const umur = parseInt(args[4]);

      if (isNaN(berat) || isNaN(tinggi) || isNaN(umur)) {
          return message.reply("Berat, tinggi, dan umur harus berupa angka.");
      }

      let bmr;

      if (gender === "pria") {
          bmr = 10 * berat + 6.25 * tinggi - 5 * umur + 5;
      } else if (gender === "wanita") {
          bmr = 10 * berat + 6.25 * tinggi - 5 * umur - 161;
      } else {
          return message.reply("Jenis kelamin harus `pria` atau `wanita`.");
      }

      message.reply(
          `🔥 Kebutuhan kalori dasar (BMR): **${Math.round(bmr)} kkal/hari**\n\n` +
          `Aktivitas:\n` +
          `🪑 Sangat jarang olahraga: **${Math.round(bmr * 1.2)} kkal**\n` +
          `🚶 Ringan (1-3x/minggu): **${Math.round(bmr * 1.375)} kkal**\n` +
          `🏃 Sedang (3-5x/minggu): **${Math.round(bmr * 1.55)} kkal**\n` +
          `💪 Berat (6-7x/minggu): **${Math.round(bmr * 1.725)} kkal**\n` +
          `🔥 Atlet: **${Math.round(bmr * 1.9)} kkal**`
      );
  }
  if (message.content.toLowerCase() === "!help") {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x3498DB) // Warna biru medis
            .setTitle('🩺 Pusat Bantuan Asisten Kesehatan')
            .setDescription('Halo! Saya adalah bot asisten kesehatan kamu. Berikut adalah daftar layanan yang saya sediakan:')
            .addFields(
                { 
                    name: '🩸 `!diabetes`', 
                    value: 'Memulai sesi interaktif untuk memprediksi tingkat risiko diabetes kamu menggunakan kecerdasan buatan (AI) dengan akurasi F1 Score (0.8026).', 
                    inline: false 
                },
                { 
                    name: '⚖️ `!bmi`', 
                    value: 'Menghitung Body Mass Index (Indeks Massa Tubuh) untuk mengetahui apakah berat badanmu ideal.', 
                    inline: false 
                },
                { 
                    name: '🍏 `!kalori`', 
                    value: 'Menghitung estimasi kebutuhan kalori harianmu berdasarkan berat, tinggi, dan usia.', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Ketik salah satu perintah di atas untuk memulai!' })
            .setTimestamp();

        return message.reply({ embeds: [helpEmbed] });
  }
});

client.login(process.env.token_bot);
