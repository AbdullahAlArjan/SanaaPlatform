using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sanaa.DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddBioToFreelancerProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ServiceID",
                table: "Orders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ServicePriceSnapshot",
                table: "Orders",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Bio",
                table: "FreelancerProfiles",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_ServiceID",
                table: "Orders",
                column: "ServiceID");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Services_ServiceID",
                table: "Orders",
                column: "ServiceID",
                principalTable: "Services",
                principalColumn: "ServiceID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Services_ServiceID",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_ServiceID",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ServiceID",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ServicePriceSnapshot",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "Bio",
                table: "FreelancerProfiles");
        }
    }
}
