# Script On-Login MikroTik (Otomatis Expired)
# Script ini akan otomatis mengubah komen dan membuat scheduler saat voucher pertama kali login.

:local validity "30d";

:local ucomment [/ip hotspot user get $user comment];
:if ([:pick $ucomment 0 3] = "vc-") do={
    :local date [/system clock get date];
    :local time [/system clock get time];
    
    # Deteksi Format Tanggal (ROS v6 vs v7)
    :local dM; :local dd; :local dy;
    :if ([:len $date] = 10) do={
        :set dy [:pick $date 0 4];
        :set dM [:pick $date 5 7];
        :set dd [:pick $date 8 10];
    } else={
        :local mdict {"jan"="01";"feb"="02";"mar"="03";"apr"="04";"may"="05";"jun"="06";"jul"="07";"aug"="08";"sep"="09";"oct"="10";"nov"="11";"dec"="12"};
        :set dM ($mdict->[:pick $date 0 3]);
        :set dd [:pick $date 4 6];
        :set dy [:pick $date 7 11];
    }
    
    # Hitung total hari
    :local vdays [:pick $validity 0 ([:len $validity]-1)];
    :set dd ($dd + $vdays);
    
    :local md 31;
    :while ($dd > $md) do={
        :if ($dM="01" || $dM="03" || $dM="05" || $dM="07" || $dM="08" || $dM="10" || $dM="12") do={ :set md 31; }
        :if ($dM="04" || $dM="06" || $dM="09" || $dM="11") do={ :set md 30; }
        :if ($dM="02") do={
            :if (($dy % 4 = 0) && ($dy % 100 != 0 || $dy % 400 = 0)) do={ :set md 29; } else={ :set md 28; }
        }
        :if ($dd > $md) do={
            :set dd ($dd - $md);
            :set dM ($dM + 1);
            :if ($dM > 12) do={
                :set dM 1;
                :set dy ($dy + 1);
            }
        }
    }
    
    # Format kembali
    :local smM [:tostr $dM]; :if ([:len $smM]=1) do={:set smM ("0".$smM);}
    :local smd [:tostr $dd]; :if ([:len $smd]=1) do={:set smd ("0".$smd);}
    
    # Komen baru format: YYYY-MM-DD HH:mm:ss
    :local newcomment ($dy . "-" . $smM . "-" . $smd . " " . $time);
    
    # Set comment user
    /ip hotspot user set $user comment=$newcomment;
    
    # Convert ke format scheduler MikroTik (M/D/Y)
    :local mdict2 {"01"="jan";"02"="feb";"03"="mar";"04"="apr";"05"="may";"06"="jun";"07"="jul";"08"="aug";"09"="sep";"10"="oct";"11"="nov";"12"="dec"};
    :local smonth ($mdict2->$smM);
    :local schedDate ($smonth . "/" . $smd . "/" . $dy);
    
    # Buat Scheduler Auto-Disable
    :local schedName ("exp-" . $user);
    /system scheduler add name=$schedName start-date=$schedDate start-time=$time interval=0 on-event="/ip hotspot user disable [find name=\"$user\"]" comment="Auto-disable by Allstar Script";
}
