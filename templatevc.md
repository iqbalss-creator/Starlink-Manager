																		<?php

// FORMAT MASA AKTIF
if(substr($validity,-1) == "d"){
    $validity = "MASA AKTIF : ".substr($validity,0,-1)." HARI";
}
else if(substr($validity,-1) == "h"){
    $validity = "MASA AKTIF : ".substr($validity,0,-1)." JAM";
}

// FORMAT DURASI
if(substr($timelimit,-1) == "d" && strlen($timelimit) > 3){
    $timelimit = "DURASI : ".((substr($timelimit,0,-1)*7)+substr($timelimit,2,1))." HARI";
}
else if(substr($timelimit,-1) == "d"){
    $timelimit = "DURASI : ".substr($timelimit,0,-1)." HARI";
}
else if(substr($timelimit,-1) == "h"){
    $timelimit = "DURASI : ".substr($timelimit,0,-1)." JAM";
}
else if(substr($timelimit,-1) == "w"){
    $timelimit = "DURASI : ".(substr($timelimit,0,-1)*7)." HARI";
}

// WARNA BERDASARKAN HARGA
if($getsprice == "2000"){
    $color = "#616161";
}
elseif($getsprice == "5000"){
    $color = "#E91E63";
}
elseif($getsprice == "8000"){
    $color = "#673AB7";
}
elseif($getsprice == "22000"){
    $color = "#1976D2";
}
elseif($getsprice == "70000"){
    $color = "#28A745";
}
elseif($getsprice == "150000"){
    $color = "#FF6F00";
}
elseif($getsprice == "1500000"){
    $color = "#0D47A1";
}
else{
    $color = "#00ACC1";
}

?>

<style>
.qrcode{
    width:60px;
    height:60px;
}
</style>

<table style="display:inline-block;border-collapse:collapse;border:1px solid #000;width:190px;overflow:hidden;margin:2px;">
<tbody>

<tr>
<td valign="top">

<table style="width:100%;">
<tbody>
<tr>

<td style="width:75px">

<div style="position:relative;z-index:-1;padding:0;float:left;">
<div style="position:absolute;top:0;display:inline;margin-top:-100px;width:0;height:0;border-top:230px solid transparent;border-left:50px solid transparent;border-right:140px solid #DCDCDC;"></div>
</div>

<img style="margin:5px 0 0 5px;" width="85" height="20" src="<?php echo $logo;?>" alt="logo">

</td>

<td style="width:115px">

<div style="float:right;font-size:8px;font-weight:bold;color:#666;padding-right:5px;">
#<?= $num; ?>
</div>

<div style="text-align:right;font-weight:bold;font-family:Tahoma;font-size:20px;padding-left:17px;color:<?php echo $color ?>">

<small style="font-size:10px;margin-left:-17px;position:absolute;">
<?= explode(" ",$price)[0]?>
</small>

<?= explode(" ",$price)[1]?>

</div>

</td>

</tr>
</tbody>
</table>

</td>
</tr>

<tr>
<td valign="top">

<table style="width:100%;border-collapse:collapse;">
<tbody>

<tr>

<td style="width:95px;" valign="top">

<?php if($v_opsi=='up'){ ?>

<?php } else { ?>

<div style="padding:0;border-bottom:1px solid <?php echo $color ?>;text-align:center;font-weight:bold;font-size:10px;">
VOUCHER
</div>

<div style="padding:0;border-bottom:1px solid <?php echo $color ?>;text-align:center;font-weight:bold;font-size:14px;color:#000;">
<?php echo $username;?>
</div>

<?php } ?>

<div style="text-align:center;color:#111;font-size:7px;font-weight:bold;padding:2.5px;">
Wi-Fi ALLSTAR
</div>

</td>

<td style="width:100px;text-align:right;">

<div style="padding:0 2.5px;font-size:7px;font-weight:bold;color:#000;">

<?php echo $validity; ?>
<br>

<?php echo $timelimit; ?>
<br>

<?php echo $datalimit; ?>

</div>

<!--div style="float:right;padding:1px;text-align:right;width:70%;margin:0 5px -20px 0;">
<?= $qrcode ?>
</div-->

</td>

</tr>

<tr>

<td colspan="2" style="background:<?php echo $color ?>;padding:0;">

<div style="color:#fff;font-size:9px;font-weight:bold;padding:2.5px;">

<span style="float:left;">
CS : 0812-486-9807
</span>

<span style="float:right;">
#<?= $num; ?>
</span>

<div style="clear:both;"></div>

</div>

</td>

</tr>

</tbody>
</table>

</td>
</tr>

</tbody>
</table>	        	        	        