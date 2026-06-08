from datetime import timedelta

from tortoise import Model, fields, timezone




class OtAdsStakingOrder(Model):
    id = fields.IntField(pk=True)
    gmt_create = fields.DatetimeField(auto_now_add=True)
    gmt_modified = fields.DatetimeField(auto_now=True)
    ext_info = fields.JSONField(null=True)
    deleted = fields.BooleanField(default=False)
    staking_order_id = fields.CharField(max_length=64)
    staking_order_type = fields.CharField(max_length=32)
    staking_amount = fields.DecimalField(max_digits=40, decimal_places=8, default=0)
    asset_type = fields.CharField(max_length=32)
    user_id = fields.CharField(max_length=64)
    status = fields.CharField(max_length=16, default="INIT")
    pay_way = fields.CharField(max_length=64, null=True)
    pay_status = fields.CharField(max_length=32, null=True)
    payed_time = fields.DatetimeField(auto_now=False, default=None, null=True)
    pay_info = fields.JSONField(null=True)

    class Meta:
        table = "ot_ads_staking_order"
        select_fields = ["staking_order_id", "staking_order_type", "staking_amount", "asset_type", "user_id", "status",
                         "pay_way", "pay_status", "payed_time", "pay_info"]


class OtStakingRedemptionOrder(Model):
    id = fields.IntField(pk=True)
    gmt_create = fields.DatetimeField(auto_now_add=True)
    gmt_modified = fields.DatetimeField(auto_now=True)
    staking_order_id = fields.CharField(max_length=64)
    redemption_order_id = fields.CharField(max_length=64)
    staking_amount = fields.DecimalField(max_digits=40, decimal_places=8, default=0)
    interest_amount = fields.DecimalField(max_digits=40, decimal_places=8, default=0)
    penalty_amount = fields.DecimalField(max_digits=40, decimal_places=8, default=0)
    asset_type = fields.CharField(max_length=32)
    user_id = fields.CharField(max_length=64)
    status = fields.CharField(max_length=16, default="INIT")
    pay_way = fields.CharField(max_length=64, null=True)
    pay_status = fields.CharField(max_length=32, default="INIT", null=True)
    payed_time = fields.DatetimeField(auto_now=False, null=True)
    pay_info = fields.JSONField(null=True)
    ext_info = fields.JSONField(null=True)
    deleted = fields.BooleanField(default=False)

    class Meta:
        table = "ot_ads_redemption_order"
        select_fields = ["staking_order_id", "redemption_order_id", "staking_amount", "interest_amount",
                         "penalty_amount", "asset_type",
                         "user_id", "status", "pay_way", "pay_status", "payed_time", "pay_info"]


